import streamlit as st
from pymongo import MongoClient
from config import MONGO_URI

@st.cache_resource
def get_mongo_client():
    """Returns a cached MongoDB client instance."""
    try:
        client = MongoClient(MONGO_URI)
        client.admin.command('ping')
        return client
    except Exception as e:
        st.error(f"Failed to connect to MongoDB: {str(e)}")
        return None

def get_collection(collection_name):
    """Returns a MongoDB collection."""
    client = get_mongo_client()
    if client is None:
        return None
    
    db_name = MONGO_URI.split('/')[-1].split('?')[0]
    db = client[db_name]
    return db[collection_name]
