"""
Script de pruebas para el chatbot de UrbanFlow
Verifica que el chatbot funcione correctamente con diferentes tipos de consultas
"""

import sys
import os
from pathlib import Path

# Agregar el directorio raíz del proyecto al path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.chatbot import ChatbotService
from app.services.query_builder import QueryBuilder
from app.core.config import settings

def test_query_builder_corrections():
    """Prueba las correcciones automáticas del QueryBuilder"""
    print("\n" + "="*80)
    print("TEST 1: Corrección automática de consultas de estados de cabinas")
    print("="*80)
    
    db = SessionLocal()
    try:
        query_builder = QueryBuilder(db)
        
        # Test 1: Corrección de cabinas.estado a cabina_estado_hist.estado
        incorrect_query = "SELECT COUNT(*) FROM cabinas WHERE estado = 'operativa';"
        print(f"\nConsulta incorrecta: {incorrect_query}")
        
        corrected = query_builder.auto_correct_cabin_state_query(incorrect_query)
        print(f"Consulta corregida: {corrected}")
        
        assert "cabina_estado_hist" in corrected, "[ERROR] No se corrigió la tabla"
        assert "cabinas" not in corrected or "cabinas" not in corrected.split("FROM")[1], "[ERROR] Todavía contiene 'cabinas'"
        print("[PASS] Corrección automática funciona correctamente")
        
        # Test 2: Consulta ya correcta no debe cambiar
        correct_query = "SELECT COUNT(*) FROM cabina_estado_hist WHERE estado = 'operativa';"
        print(f"\nConsulta correcta: {correct_query}")
        
        unchanged = query_builder.auto_correct_cabin_state_query(correct_query)
        print(f"Consulta después de corrección: {unchanged}")
        
        assert unchanged == correct_query, "[ERROR] Se modificó una consulta correcta"
        print("[PASS] Consulta correcta no se modifica")
        
    finally:
        db.close()

def test_chatbot_sql_generation():
    """Prueba la generación de SQL del chatbot"""
    print("\n" + "="*80)
    print("TEST 2: Generación de consultas SQL")
    print("="*80)
    
    db = SessionLocal()
    try:
        chatbot = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=False
        )
        
        # Test 1: Consulta de estados de cabinas
        question = "¿Cuántas cabinas están operativas?"
        print(f"\nPregunta: {question}")
        
        result = chatbot.process_query(question, include_ml_analysis=False, user_role="admin")
        
        print(f"\nResultado:")
        print(f"  - Éxito: {result.get('success')}")
        print(f"  - Tipo: {result.get('query_type')}")
        
        if result.get('success'):
            print(f"  - Respuesta: {result.get('response', '')[:200]}...")
            print("  [PASS] Consulta procesada exitosamente")
        else:
            print(f"  - Error: {result.get('error', 'Desconocido')}")
            print("  [FAIL] La consulta falló")
            
    finally:
        db.close()

def test_role_based_access():
    """Prueba el control de acceso por rol"""
    print("\n" + "="*80)
    print("TEST 3: Control de acceso por rol")
    print("="*80)
    
    db = SessionLocal()
    try:
        # Test 1: Cliente intentando acceder a datos restringidos
        chatbot_cliente = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=False
        )
        
        restricted_question = "Muéstrame todas las mediciones de telemetría cruda"
        print(f"\nPregunta (rol: cliente): {restricted_question}")
        
        result = chatbot_cliente.process_query(restricted_question, include_ml_analysis=False, user_role="cliente")
        
        print(f"Resultado:")
        print(f"  - Éxito: {result.get('success')}")
        print(f"  - Respuesta: {result.get('response', '')[:200]}...")
        
        if not result.get('success') or "no puedo" in result.get('response', '').lower() or "acceso denegado" in result.get('response', '').lower():
            print("[PASS] Acceso restringido correctamente para cliente")
        else:
            print("[FAIL] El cliente pudo acceder a datos restringidos")
        
        # Test 2: Admin puede acceder a más datos
        chatbot_admin = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=False
        )
        
        admin_question = "Muéstrame las últimas 10 mediciones"
        print(f"\nPregunta (rol: admin): {admin_question}")
        
        result = chatbot_admin.process_query(admin_question, include_ml_analysis=False, user_role="admin")
        
        print(f"Resultado:")
        print(f"  - Éxito: {result.get('success')}")
        
        if result.get('success'):
            print("[PASS] Admin puede acceder a datos")
        else:
            print(f"[FAIL] Admin no pudo acceder - {result.get('error', 'Desconocido')}")
            
    finally:
        db.close()

def test_query_types():
    """Prueba diferentes tipos de consultas"""
    print("\n" + "="*80)
    print("TEST 4: Diferentes tipos de consultas")
    print("="*80)
    
    db = SessionLocal()
    try:
        chatbot = ChatbotService(
            db=db,
            llm_provider=settings.LLM_PROVIDER,
            model_name=settings.MODEL_NAME,
            enable_ml_analysis=False
        )
        
        test_cases = [
            {
                "question": "¿Cuántas cabinas están operativas?",
                "expected_type": "data_query",
                "description": "Consulta de conteo de estados",
                "should_generate_sql": True
            },
            {
                "question": "¿Qué significa RMS?",
                "expected_type": "informational",
                "description": "Pregunta informacional",
                "should_generate_sql": False  # NO debe generar SQL
            },
            {
                "question": "Muéstrame las últimas 5 mediciones",
                "expected_type": "data_query",
                "description": "Consulta de datos recientes",
                "should_generate_sql": True
            },
            {
                "question": "¿Cuál es el promedio de RMS?",
                "expected_type": "data_query",
                "description": "Consulta de agregación",
                "should_generate_sql": True
            },
            {
                "question": "Explica qué es UrbanFlow",
                "expected_type": "informational",
                "description": "Pregunta informacional de explicación",
                "should_generate_sql": False  # NO debe generar SQL
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\nTest {i}: {test_case['description']}")
            print(f"Pregunta: {test_case['question']}")
            
            result = chatbot.process_query(
                test_case['question'],
                include_ml_analysis=False,
                user_role="admin"
            )
            
            detected_type = result.get('query_type')
            success = result.get('success')
            
            print(f"  - Tipo detectado: {detected_type}")
            print(f"  - Tipo esperado: {test_case['expected_type']}")
            print(f"  - Éxito: {success}")
            
            # Verificar que el tipo detectado sea correcto
            type_correct = (detected_type == test_case['expected_type'] or 
                          (test_case['expected_type'] == 'data_query' and detected_type in ['data_query', 'data']))
            
            if success and type_correct:
                # Verificar que preguntas informacionales NO generen SQL
                if not test_case['should_generate_sql']:
                    # No debe tener datos de SQL en la respuesta
                    has_sql_data = 'data' in result and result.get('data') is not None
                    if not has_sql_data:
                        print(f"  [PASS] Pregunta informacional NO generó SQL (correcto)")
                    else:
                        print(f"  [FAIL] Pregunta informacional generó SQL (incorrecto)")
                else:
                    print(f"  [PASS] Consulta procesada correctamente")
            else:
                print(f"  [FAIL] Tipo incorrecto o consulta falló - {result.get('error', 'Desconocido')}")
                
    finally:
        db.close()

def test_sql_validation():
    """Prueba la validación de SQL"""
    print("\n" + "="*80)
    print("TEST 5: Validación de consultas SQL")
    print("="*80)
    
    db = SessionLocal()
    try:
        query_builder = QueryBuilder(db)
        
        test_cases = [
            {
                "query": "SELECT * FROM mediciones LIMIT 10;",
                "should_be_valid": True,
                "description": "Consulta SELECT válida"
            },
            {
                "query": "DELETE FROM mediciones WHERE medicion_id = 1;",
                "should_be_valid": False,
                "description": "Consulta DELETE (debe ser rechazada)"
            },
            {
                "query": "UPDATE mediciones SET rms = 5.0;",
                "should_be_valid": False,
                "description": "Consulta UPDATE (debe ser rechazada)"
            },
            {
                "query": "SELECT COUNT(*) FROM cabina_estado_hist WHERE estado = 'operativa';",
                "should_be_valid": True,
                "description": "Consulta de conteo válida"
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\nTest {i}: {test_case['description']}")
            print(f"Consulta: {test_case['query']}")
            
            is_valid, error = query_builder.validate_query(test_case['query'])
            
            print(f"  - Válida: {is_valid}")
            if error:
                print(f"  - Error: {error}")
            
            if is_valid == test_case['should_be_valid']:
                print(f"  [PASS] Validación correcta")
            else:
                print(f"  [FAIL] Validación incorrecta")
                
    finally:
        db.close()

def run_all_tests():
    """Ejecuta todas las pruebas"""
    print("\n" + "="*80)
    print("INICIANDO PRUEBAS DEL CHATBOT DE URBANFLOW")
    print("="*80)
    
    tests = [
        ("Corrección automática de consultas", test_query_builder_corrections),
        ("Generación de SQL", test_chatbot_sql_generation),
        ("Control de acceso por rol", test_role_based_access),
        ("Diferentes tipos de consultas", test_query_types),
        ("Validación de SQL", test_sql_validation),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            test_func()
            results.append((test_name, True, None))
        except Exception as e:
            print(f"\n[ERROR] en {test_name}: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False, str(e)))
    
    # Resumen
    print("\n" + "="*80)
    print("RESUMEN DE PRUEBAS")
    print("="*80)
    
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)
    
    for test_name, success, error in results:
        status = "[PASS]" if success else "[FAIL]"
        print(f"{status}: {test_name}")
        if error:
            print(f"  Error: {error}")
    
    print(f"\nTotal: {passed}/{total} pruebas pasaron")
    
    if passed == total:
        print("\n[SUCCESS] ¡Todas las pruebas pasaron!")
    else:
        print(f"\n[WARNING] {total - passed} prueba(s) fallaron")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

