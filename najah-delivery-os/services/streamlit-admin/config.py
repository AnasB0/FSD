import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/najah_delivery')
EXPRESS_API_URL = os.getenv('EXPRESS_API_URL', 'http://localhost:3000/api')
STREAMLIT_ADMIN_PORT = int(os.getenv('STREAMLIT_ADMIN_PORT', 8501))
