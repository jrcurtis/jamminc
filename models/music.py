
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

def proto(*args):
    res = {}
    for arg in args:
        res.update(arg)
    return res

def browse_page(queries):
    browse_lists = [
        ('songs', db.songs, queries.get('songs', None)),
        ('instruments', db.instruments, queries.get('instruments', None)),
        ('tracks', db.tracks, queries.get('tracks', None))
        ]

    browse_data = {}
    page_vars = {}

    for tablename, table, query in browse_lists:
        if query is None:
            continue
        
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

        page_vars[tablename + '_p'] = page
        page_vars[tablename + '_s'] = sort_field

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

    for tablename, data in browse_data.items():
        if data['page'] != 0:
            prev_data = { tablename + '_p': data['page'] - 1 }
            data['prev'] = A(
                '<Previous', _href=URL(vars=proto(page_vars, prev_data)))

            first_data = { tablename + '_p': 0 }
            data['first'] = A(
                '<<First', _href=URL(vars=proto(page_vars, first_data)))
        else:
            data['prev'] = ''
            data['first'] = ''


        if data['page'] != data['pages'] - 1:
            next_data = { tablename + '_p': data['page'] + 1 }
            data['next'] = A(
                'Next>', _href=URL(vars=proto(page_vars, next_data)))

            last_data = { tablename + '_p': data['pages'] - 1 }
            data['last'] = A(
                'Last>>', _href=URL(vars=proto(page_vars, last_data)))
        else:
            data['next'] = ''
            data['last'] = ''

        for sort_field in ['created', 'rating', 'views']:
            sort_data = { tablename + '_s': sort_field }
            data[sort_field] = URL(vars=proto(page_vars, sort_data))

    return { 'browse_data': browse_data }

