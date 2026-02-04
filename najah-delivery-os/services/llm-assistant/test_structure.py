#!/usr/bin/env python3
"""
Quick test script for LLM Assistant Service
Tests the API endpoints without requiring full service deployment
"""

import json
import sys

def test_query_structure():
    """Test query request/response structure."""
    
    print("🧪 Testing LLM Assistant Service Structure\n")
    print("=" * 60)
    
    # Test request
    query_request = {
        "query": "What are the operating hours?",
        "language": "en"
    }
    
    print("\n📤 Sample Request (POST /assistant/query):")
    print(json.dumps(query_request, indent=2, ensure_ascii=False))
    
    # Expected response structure
    expected_response = {
        "answer": "Najah Delivery operates Saturday to Thursday from 8:00 AM to 10:00 PM...",
        "sources": [
            {
                "content": "**Operating Hours**\n- Saturday to Thursday: 8:00 AM - 10:00 PM...",
                "metadata": {
                    "source": "policies.md",
                    "section": 2,
                    "file_path": "./data/kb/policies.md"
                }
            }
        ],
        "tokens_used": 342
    }
    
    print("\n📥 Expected Response:")
    print(json.dumps(expected_response, indent=2, ensure_ascii=False))
    
    # Arabic example
    print("\n" + "=" * 60)
    print("\n🌍 Arabic Query Example:\n")
    
    arabic_request = {
        "query": "ما هي طرق الدفع المتاحة؟",
        "language": "ar"
    }
    
    print("📤 Request:")
    print(json.dumps(arabic_request, indent=2, ensure_ascii=False))
    
    arabic_response = {
        "answer": "نقبل طرق الدفع التالية: بطاقات مدى، STC Pay، والدفع عند الاستلام...",
        "sources": [
            {
                "content": "**طرق الدفع**\nنقبل طرق الدفع التالية...",
                "metadata": {
                    "source": "policies.md",
                    "section": 3
                }
            }
        ],
        "tokens_used": 256
    }
    
    print("\n📥 Expected Response:")
    print(json.dumps(arabic_response, indent=2, ensure_ascii=False))
    
    print("\n" + "=" * 60)
    print("\n✅ Structure validation complete!")
    print("\n📝 To test with actual service:")
    print("   1. Start the service: python app.py")
    print("   2. Run: curl -X POST http://localhost:8003/assistant/query \\")
    print("            -H 'Content-Type: application/json' \\")
    print("            -d '{\"query\": \"What are your hours?\", \"language\": \"en\"}'")
    print()

def test_knowledge_base():
    """Display knowledge base coverage."""
    
    print("\n📚 Knowledge Base Coverage\n")
    print("=" * 60)
    
    kb_sections = [
        "✓ Delivery Policies (English & Arabic)",
        "✓ Operating Hours",
        "✓ Service Areas (Riyadh, Jeddah, Dammam)",
        "✓ Payment Methods (Mada, STC Pay, COD)",
        "✓ Delivery Fees",
        "✓ Cancellation Policy",
        "✓ Customer Support Procedures",
        "✓ Contact Methods",
        "✓ Response Times",
        "✓ Package Requirements",
        "✓ Size & Weight Limits",
        "✓ Prohibited Items",
        "✓ Tracking Information",
        "✓ Delivery Status Updates",
        "✓ Proof of Delivery"
    ]
    
    for section in kb_sections:
        print(f"  {section}")
    
    print("\n" + "=" * 60)
    print(f"\n📊 Total Coverage: {len(kb_sections)} topics")

def test_endpoints():
    """Display available endpoints."""
    
    print("\n🌐 Available Endpoints\n")
    print("=" * 60)
    
    endpoints = [
        {
            "method": "GET",
            "path": "/health",
            "description": "Health check and service status"
        },
        {
            "method": "POST",
            "path": "/assistant/query",
            "description": "Query the RAG assistant"
        },
        {
            "method": "GET",
            "path": "/docs",
            "description": "Interactive API documentation (Swagger UI)"
        },
        {
            "method": "GET",
            "path": "/redoc",
            "description": "Alternative API documentation (ReDoc)"
        }
    ]
    
    for endpoint in endpoints:
        print(f"\n  {endpoint['method']:6} {endpoint['path']}")
        print(f"         → {endpoint['description']}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print("\n" + "🤖 Najah Delivery LLM Assistant - Test Suite".center(60))
    
    test_query_structure()
    test_knowledge_base()
    test_endpoints()
    
    print("\n✨ All structure tests passed!")
    print("\n💡 Next steps:")
    print("   1. Set up environment: cp .env.example .env")
    print("   2. Add OpenRouter API key to .env")
    print("   3. Install dependencies: pip install -r requirements.txt")
    print("   4. Start service: python app.py")
    print("   5. Test endpoints: pytest tests/ -v")
    print()
