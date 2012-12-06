
db.define_table(
    'instruments',
    Field('name', 'string', length=32, required=True),
    Field('data', 'string', length=32 * 1024),
    Field('author', 'reference auth_user',
          default=auth.user_id, required=True, notnull=True),
    Field('original', 'reference instruments'),
    Field('description', 'text', length=1024),
    Field('upvotes', 'integer', default=0),
    Field('downvotes', 'integer', default=0),
    Field('rating', 'double',
          compute=lambda x: x.upvotes / max(1, x.upvotes + x.downvotes)),
    Field('views', 'integer', default=0),
    Field('created', 'datetime', default=request.utcnow))

db.define_table(
    'tracks',
    Field('name', 'string', length=32, required=True),
    Field('data', 'string', length=32 * 1024),
    Field('author', 'reference auth_user',
          default=auth.user_id, required=True, notnull=True),
    Field('instrument', 'reference instruments'),
    Field('song', 'reference songs', required=True),
    Field('created', 'datetime', default=request.utcnow))

db.define_table(
    'songs',
    Field('name', 'string', length=128),
    Field('author', 'reference auth_user',
          default=auth.user_id, required=True, notnull=True),
    Field('description', 'text', length=1024),
    Field('upvotes', 'integer', default=0),
    Field('downvotes', 'integer', default=0),
    Field('rating', 'double',
          compute=lambda x: x.upvotes / max(1, x.upvotes + x.downvotes)),
    Field('views', 'integer', default=0),
    Field('created', 'datetime', default=request.utcnow))

db.define_table(
    'favorite_songs',
    Field('song', 'reference songs', required=True, notnull=True),
    Field('user', 'reference auth_user', required=True, notnull=True))

db.define_table(
    'favorite_instruments',
    Field('instrument', 'reference instruments', required=True, notnull=True),
    Field('user', 'reference auth_user', required=True, notnull=True))

db.define_table(
    'comments',
    Field('text', 'text', length=1024, required=True, label='Your comment'),
    Field('author', 'reference auth_user',
          notnull=True, writable=False, readable=False,
          default=auth.user_id),
    Field('instrument', 'reference instruments',
          writable=False, readable=False),
    Field('song', 'reference songs',
          writable=False, readable=False),
    Field('created', 'datetime', default=request.utcnow,
          writable=False, readable=False))

import math

def browse_page(queries):
    browse_lists = [
        ('songs', db.songs, queries.get('songs', None)),
        ('instruments', db.instruments, queries.get('instruments', None)),
        ('tracks', db.tracks, queries.get('tracks', None))
        ]

    browse_data = {}

    for tablename, table, query in browse_lists:
        if query is None:
            continue
        
        logger.info('paging {} query {}'.format(tablename, query))
        dbset = db(query)
        count = dbset.count()

        page_length = 10
        pages = int(math.ceil(count / float(page_length)))
        try:
            page = int(request.vars[tablename + '_p'] or 0)
        except ValueError:
            page = 0
        page = min(pages - 1, max(0, page))
        index = page_length * page
        limit = (index , index + page_length)

        sort_field = request.vars[tablename + '_s']
        if sort_field not in ['rating', 'views']:
            sort_field = 'created'

        entries = dbset.select(
            table.id, table.name,
            db.auth_user.id, db.auth_user.username,
            orderby=table[sort_field], limitby=limit)

        browse_data[tablename] = {
            'entries': entries,
            'page': page,
            'pages': pages,
            'sort': sort_field
            }

    return { 'browse_data': browse_data }

