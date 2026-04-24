# Models package
#
# Importing each model module here ensures its tables are registered with
# ``Base.metadata`` before ``create_all`` runs at startup.
from models import auth, usage  # noqa: F401
