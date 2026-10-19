import logging
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .client import get_elasticsearch_client
from .indexing import INDEX_NAME
from apps.events.models import Event
from apps.events.serializers import EventListSerializer

logger = logging.getLogger(__name__)

class SearchEventsView(APIView):
    """
    Search API endpoint with Elasticsearch inverted index lookup,
    geospatial radius queries, and resilient relational database fallback.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        term = request.query_params.get('term', '').strip()
        location = request.query_params.get('location', '').strip()
        category = request.query_params.get('type', '').strip()
        date_str = request.query_params.get('date', '').strip()
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        radius = request.query_params.get('radius', '50km')

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        from_offset = (page - 1) * page_size

        client = get_elasticsearch_client()

        if client:
            try:
                must_clauses = []
                filter_clauses = []

                if term:
                    must_clauses.append({
                        "multi_match": {
                            "query": term,
                            "fields": [
                                "title^3",
                                "name^3",
                                "performer_name^2",
                                "performer.name^2",
                                "venue_name",
                                "venue.name",
                                "city",
                                "venue.city",
                                "description"
                            ],
                            "fuzziness": "AUTO"
                        }
                    })

                if location:
                    filter_clauses.append({
                        "multi_match": {
                            "query": location,
                            "fields": ["city", "venue_name", "venue.city", "venue.state", "venue.country", "venue.name"]
                        }
                    })

                if category and category.lower() != 'all':
                    filter_clauses.append({
                        "term": {"category": category.lower()}
                    })

                if date_str:
                    d = parse_date(date_str)
                    if d:
                        filter_clauses.append({
                            "bool": {
                                "should": [
                                    {
                                        "range": {
                                            "event_date": {
                                                "gte": f"{date_str}T00:00:00",
                                                "lte": f"{date_str}T23:59:59"
                                            }
                                        }
                                    },
                                    {
                                        "range": {
                                            "date": {
                                                "gte": f"{date_str}T00:00:00",
                                                "lte": f"{date_str}T23:59:59"
                                            }
                                        }
                                    }
                                ]
                            }
                        })

                if lat and lon:
                    try:
                        filter_clauses.append({
                            "bool": {
                                "should": [
                                    {
                                        "geo_distance": {
                                            "distance": radius,
                                            "location": {
                                                "lat": float(lat),
                                                "lon": float(lon)
                                            }
                                        }
                                    },
                                    {
                                        "geo_distance": {
                                            "distance": radius,
                                            "venue.coordinates": {
                                                "lat": float(lat),
                                                "lon": float(lon)
                                            }
                                        }
                                    }
                                ]
                            }
                        })
                    except ValueError:
                        pass

                if not must_clauses:
                    must_clauses.append({"match_all": {}})

                es_query = {
                    "query": {
                        "bool": {
                            "must": must_clauses,
                            "filter": filter_clauses
                        }
                    },
                    "sort": [
                        {"_score": {"order": "desc"}},
                        {"event_date": {"order": "asc", "unmapped_type": "date"}},
                        {"date": {"order": "asc", "unmapped_type": "date"}}
                    ],
                    "from": from_offset,
                    "size": page_size
                }

                res = client.search(index=INDEX_NAME, body=es_query)
                hits = res['hits']['hits']
                total = res['hits']['total']['value']

                events = []
                for h in hits:
                    src = h['_source']
                    if 'performer' not in src or not isinstance(src.get('performer'), dict):
                        src['performer'] = {
                            'id': src.get('id', ''),
                            'name': src.get('performer_name', ''),
                            'genre': 'Live',
                            'avatar_url': ''
                        }
                    if 'venue' not in src or not isinstance(src.get('venue'), dict):
                        loc = src.get('location', {})
                        src['venue'] = {
                            'id': src.get('id', ''),
                            'name': src.get('venue_name', ''),
                            'city': src.get('city', ''),
                            'state': '',
                            'country': '',
                            'coordinates': {
                                'lat': loc.get('lat', 0.0) if isinstance(loc, dict) else 0.0,
                                'lon': loc.get('lon', 0.0) if isinstance(loc, dict) else 0.0
                            }
                        }
                    if 'name' not in src and 'title' in src:
                        src['name'] = src['title']
                    if 'date' not in src and 'event_date' in src:
                        src['date'] = str(src['event_date'])
                    events.append(src)

                response = Response({
                    "engine": "elasticsearch",
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "results": events
                })

                # Set Edge CDN caching for 30 seconds as specified in Step 4
                response['Cache-Control'] = 'public, max-age=30'
                return response

            except Exception as e:
                logger.warning("Elasticsearch query failed, falling back to PostgreSQL/SQLite: %s", e)

        # Resilient Database Fallback
        queryset = Event.objects.select_related('venue', 'performer').prefetch_related('tickets').all()

        if term:
            queryset = queryset.filter(
                Q(title__icontains=term) |
                Q(performer__name__icontains=term) |
                Q(venue__name__icontains=term) |
                Q(description__icontains=term)
            )

        if location:
            queryset = queryset.filter(
                Q(venue__city__icontains=location) |
                Q(venue__name__icontains=location)
            )

        if category and category.lower() != 'all':
            queryset = queryset.filter(category=category.lower())

        if date_str:
            d = parse_date(date_str)
            if d:
                queryset = queryset.filter(event_date__date=d)

        total = queryset.count()
        paginated_events = queryset[from_offset:from_offset + page_size]
        serializer = EventListSerializer(paginated_events, many=True)

        # Transform to standardized PartialEvent structure
        results = []
        for ev in serializer.data:
            results.append({
                "id": ev["id"],
                "name": ev["name"],
                "description": ev["description"],
                "category": ev["category"],
                "date": ev.get("date"),
                "status": ev.get("status", "open_for_booking"),
                "banner_image": ev.get("banner_image", ""),
                "surge_mode_active": ev.get("surge_mode_active", False),
                "performer": {
                    "id": ev["performer"]["id"],
                    "name": ev["performer"]["name"],
                    "genre": ev["performer"]["genre"],
                    "avatar_url": ev["performer"].get("avatar_url", "")
                },
                "venue": {
                    "id": ev["venue"]["id"],
                    "name": ev["venue"]["name"],
                    "city": ev["venue"]["city"],
                    "state": ev["venue"].get("state", ""),
                    "country": ev["venue"].get("country", ""),
                    "coordinates": {
                        "lat": float(ev["venue"]["latitude"]),
                        "lon": float(ev["venue"]["longitude"])
                    }
                },
                "min_price": float(ev["min_price"]) if ev["min_price"] is not None else 0.0,
                "available_tickets": ev["available_tickets_count"]
            })

        response = Response({
            "engine": "database_index",
            "total": total,
            "page": page,
            "page_size": page_size,
            "results": results
        })
        response['Cache-Control'] = 'public, max-age=30'
        return response
