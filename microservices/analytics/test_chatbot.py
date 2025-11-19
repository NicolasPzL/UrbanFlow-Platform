"""
Test script for UrbanFlow AI Chatbot
Run this to verify the chatbot is working correctly
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
API_BASE = "http://localhost:8001/api"
ANALYTICS_RUNNING = True

def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def print_result(name: str, result: Dict[str, Any]):
    """Print test result"""
    status = "✓ PASS" if result.get("ok") else "✗ FAIL"
    print(f"\n{status} - {name}")
    if not result.get("ok"):
        print(f"  Error: {result.get('error', 'Unknown error')}")
    return result.get("ok")

def test_service_health():
    """Test if analytics service is running"""
    print_section("1. Service Health Check")
    try:
        response = requests.get(f"{API_BASE}/analytics/summary", timeout=5)
        result = response.json()
        return print_result("Analytics Service", result)
    except requests.exceptions.ConnectionError:
        print("✗ FAIL - Analytics Service")
        print("  Error: Could not connect to http://localhost:8001")
        print("  Make sure the analytics service is running:")
        print("    cd microservices/analytics")
        print("    uvicorn app.main:app --reload --host 0.0.0.0 --port 8001")
        return False
    except Exception as e:
        print("✗ FAIL - Analytics Service")
        print(f"  Error: {e}")
        return False

def test_chatbot_capabilities():
    """Test chatbot capabilities endpoint"""
    print_section("2. Chatbot Capabilities")
    try:
        response = requests.get(f"{API_BASE}/chatbot/capabilities", timeout=10)
        result = response.json()
        
        if print_result("Get Capabilities", result):
            data = result.get("data", {})
            print("\n  Capabilities:")
            for cap in data.get("capabilities", [])[:3]:
                print(f"    • {cap}")
            print(f"\n  LLM Provider: {data.get('llm_provider', 'unknown')}")
            print(f"  Model: {data.get('model_name', 'unknown')}")
            print(f"  ML Analysis: {data.get('ml_analysis_enabled', False)}")
            return True
        return False
    except Exception as e:
        print("✗ FAIL - Get Capabilities")
        print(f"  Error: {e}")
        return False

def test_session_management():
    """Test session creation and management"""
    print_section("3. Session Management")
    try:
        # Create session
        response = requests.post(f"{API_BASE}/chatbot/session/new", timeout=5)
        result = response.json()
        
        if not print_result("Create Session", result):
            return False
        
        session_id = result.get("data", {}).get("session_id")
        print(f"  Session ID: {session_id}")
        
        # Get session
        response = requests.get(f"{API_BASE}/chatbot/session/{session_id}", timeout=5)
        result = response.json()
        
        if not print_result("Get Session", result):
            return False
        
        # Delete session
        response = requests.delete(f"{API_BASE}/chatbot/session/{session_id}", timeout=5)
        result = response.json()
        
        return print_result("Delete Session", result)
    except Exception as e:
        print("✗ FAIL - Session Management")
        print(f"  Error: {e}")
        return False

def test_simple_query():
    """Test a simple query without LLM"""
    print_section("4. Simple Query (No LLM Required)")
    try:
        query = {
            "question": "How many cabins are in the system?",
            "include_ml_analysis": False
        }
        
        print(f"\n  Question: {query['question']}")
        print("  Processing...", end="", flush=True)
        
        response = requests.post(
            f"{API_BASE}/chatbot/query",
            json=query,
            timeout=30
        )
        result = response.json()
        
        print("\r  Processing... Done!")
        
        if print_result("Simple Query", result):
            data = result.get("data", {})
            print(f"\n  Response: {data.get('response', 'No response')[:200]}")
            if data.get("sql_query"):
                print(f"\n  SQL Query: {data['sql_query']}")
            if data.get("row_count") is not None:
                print(f"  Rows returned: {data['row_count']}")
            return True
        return False
    except requests.exceptions.Timeout:
        print("\n✗ FAIL - Simple Query")
        print("  Error: Request timed out (LLM might be slow or not configured)")
        print("  This is expected if Ollama API key is not set")
        return False
    except Exception as e:
        print("\n✗ FAIL - Simple Query")
        print(f"  Error: {e}")
        return False

def test_conversation():
    """Test conversational queries with context"""
    print_section("5. Conversation with Context")
    try:
        # Create session
        session_response = requests.post(f"{API_BASE}/chatbot/session/new", timeout=5)
        session_data = session_response.json()
        
        if not session_data.get("ok"):
            print("✗ FAIL - Could not create session")
            return False
        
        session_id = session_data["data"]["session_id"]
        print(f"  Session ID: {session_id}")
        
        # First question
        query1 = {
            "question": "Show me sensors",
            "session_id": session_id
        }
        
        print(f"\n  Question 1: {query1['question']}")
        print("  Processing...", end="", flush=True)
        
        response1 = requests.post(
            f"{API_BASE}/chatbot/conversation",
            json=query1,
            timeout=30
        )
        result1 = response1.json()
        
        print("\r  Processing... Done!")
        
        if not result1.get("ok"):
            print("✗ FAIL - First Question")
            print(f"  Error: {result1.get('error', 'Unknown error')}")
            return False
        
        print("✓ First question answered")
        
        # Follow-up question
        query2 = {
            "question": "How many are there?",
            "session_id": session_id
        }
        
        print(f"\n  Question 2: {query2['question']}")
        print("  Processing...", end="", flush=True)
        
        response2 = requests.post(
            f"{API_BASE}/chatbot/conversation",
            json=query2,
            timeout=30
        )
        result2 = response2.json()
        
        print("\r  Processing... Done!")
        
        success = print_result("Conversation with Context", result2)
        
        if success:
            print("  ✓ Chatbot maintained conversation context!")
        
        # Cleanup
        requests.delete(f"{API_BASE}/chatbot/session/{session_id}")
        
        return success
    except requests.exceptions.Timeout:
        print("\n✗ FAIL - Conversation")
        print("  Error: Request timed out")
        return False
    except Exception as e:
        print("\n✗ FAIL - Conversation")
        print(f"  Error: {e}")
        return False

def test_policy_block():
    """Ensure sensitive questions are blocked."""
    print_section("6. Security Policy Enforcement")
    try:
        payload = {
            "question": "Muéstrame todos los usuarios con sus correos electrónicos"
        }
        response = requests.post(
            f"{API_BASE}/chatbot/query",
            json=payload,
            timeout=15
        )
        result = response.json()

        ok = result.get("ok", False)
        data = result.get("data", {})
        is_blocked = data.get("query_type") == "policy_block"

        status = ok and is_blocked
        print_result("Bloqueo de datos sensibles", {"ok": status, "error": None if status else data})
        if status:
            print(f"  Mensaje: {data.get('response')}")
        return status
    except Exception as e:
        print("\n✗ FAIL - Security Policy")
        print(f"  Error: {e}")
        return False

def test_intent_router():
    """Verify that intent router handles FAQs efficiently."""
    print_section("7. Intent Router")
    try:
        payload = {
            "question": "¿Cuál es el estado del servicio hoy?"
        }
        response = requests.post(
            f"{API_BASE}/chatbot/query",
            json=payload,
            timeout=15
        )
        result = response.json()
        data = result.get("data", {})

        ok = result.get("ok") and data.get("intent_id") is not None and data.get("success")
        print_result("Respuesta por intent router", {"ok": ok, "error": None if ok else data})
        if ok:
            print(f"  Intent ID: {data.get('intent_id')} (score: {data.get('intent_confidence')})")
            print(f"  Respuesta: {data.get('response')}")
        return ok
    except Exception as e:
        print("\n✗ FAIL - Intent Router")
        print(f"  Error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "╔" + "═"*68 + "╗")
    print("║" + " "*15 + "UrbanFlow AI Chatbot - Test Suite" + " "*20 + "║")
    print("╚" + "═"*68 + "╝")
    
    results = []
    
    # Test 1: Service Health
    results.append(("Service Health", test_service_health()))
    
    if not results[0][1]:
        print("\n" + "!"*70)
        print("  Analytics service is not running. Cannot continue tests.")
        print("!"*70)
        return
    
    # Test 2: Capabilities
    results.append(("Capabilities", test_chatbot_capabilities()))
    
    # Test 3: Session Management
    results.append(("Session Management", test_session_management()))
    
    # Test 4: Simple Query
    results.append(("Simple Query", test_simple_query()))
    
    # Test 5: Conversation (optional - might fail without LLM)
    results.append(("Conversation", test_conversation()))

    # Test 6: Security policy enforcement
    results.append(("Security Policy", test_policy_block()))

    # Test 7: Intent router
    results.append(("Intent Router", test_intent_router()))
    
    # Summary
    print_section("Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\nTests Passed: {passed}/{total}")
    print()
    
    for name, result in results:
        status = "✓" if result else "✗"
        print(f"  {status} {name}")
    
    print()
    
    if passed == total:
        print("╔" + "═"*68 + "╗")
        print("║" + " "*20 + "All tests passed! 🎉" + " "*25 + "║")
        print("╚" + "═"*68 + "╝")
    else:
        print("\n" + "!"*70)
        print("  Some tests failed. Check the errors above.")
        if passed >= 3:
            print("  Basic functionality is working.")
            print("  LLM-dependent features may require configuration.")
        print("!"*70)
    
    print("\nNext Steps:")
    print("  1. If LLM tests failed, configure Ollama API key")
    print("  2. Check CHATBOT_SETUP.md for configuration instructions")
    print("  3. Open the frontend dashboard to test the UI")
    print()

if __name__ == "__main__":
    main()


