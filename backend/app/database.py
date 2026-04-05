from motor.motor_asyncio import AsyncIOMotorClient
from app.settings.get_env import MONGO_URI
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db_name: str = None

database = Database()

def _extract_database_name(mongodb_url: str) -> str:
    """Extract database name from MongoDB URL"""
    try:
        # Parse the URL
        parsed = urlparse(mongodb_url)
        # Get database name from path (remove leading /)
        db_name = parsed.path.lstrip('/')
        # Remove query parameters if present
        if '?' in db_name:
            db_name = db_name.split('?')[0]
        # If database name is in the URL, return it
        if db_name:
            return db_name
        # Default database name
        return "reverba"
    except Exception:
        # If parsing fails, return default
        return "reverba"

async def connect_to_mongo():
    """Create database connection"""
    try:
        database.client = AsyncIOMotorClient(MONGO_URI)
        # Extract and store database name
        database.db_name = _extract_database_name(MONGO_URI)
        # Test the connection
        await database.client.admin.command('ping')
        logger.info(f"Connected to MongoDB successfully (database: {database.db_name})")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if database.client:
        database.client.close()
        logger.info("Disconnected from MongoDB")

def get_database():
    """Get database instance"""
    if database.db_name:
        return database.client.get_database(database.db_name)
    # Fallback: try to get default database or use extracted name
    return database.client.get_database(_extract_database_name(MONGO_URI))

# Collection getters
def get_users_collection():
    return get_database().users

def get_refresh_tokens_collection():
    return get_database().refresh_tokens

def get_words_collection():
    return get_database().words

def get_daily_tasks_collection():
    return get_database().daily_tasks

def get_tutor_chats_collection():
    return get_database().tutor_chats

def get_cron_runs_collection():
    return get_database().cron_runs

def get_otps_collection():
    return get_database().otps

def get_password_reset_otps_collection():
    return get_database().password_reset_otps

def get_password_reset_eligibility_collection():
    return get_database().password_reset_eligibility

def get_email_change_otps_collection():
    return get_database().email_change_otps

def get_email_change_eligibility_collection():
    return get_database().email_change_eligibility