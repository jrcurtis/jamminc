
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

def browse_page(table, query):
    if table not in [db.songs, db.instruments, db.tracks]:
        raise ArgumentError("Can't create page for table: " + str(table))

    dbset = db(query)
    count = dbset.count()

    page_length = 20
    pages = math.ceil(count / float(page_length))
    page = request.vars[table._tablename + '_p'] or 0
    page = min(pages - 1, max(0, page))
    limit = (page_length * page, (page_length + 1) * page)

    sort_field = request.vars[table._tablename + '_s']
    if sort_field not in ['rating', 'views']:
        sort_field = 'created'

    entries = dbset.select(
        table.id, table.name,
        db.auth_user.id, db.auth_user.name,
        orderby=table[sort_field], limitby=limit)

    return {
        table._tablename: entries,
        table._tablename + '_page': page,
        table._tablename + '_end': page == pages
        }
