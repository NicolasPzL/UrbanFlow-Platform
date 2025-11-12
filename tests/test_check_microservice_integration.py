import importlib.util
import io
from contextlib import redirect_stdout
from pathlib import Path
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "check-microservice-integration.py"
SPEC = importlib.util.spec_from_file_location("check_microservice_integration", MODULE_PATH)
integration = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(integration)


REQUIRED_FILES = [
    "microservices/predictions-service/app.py",
    "microservices/predictions-service/requirements.txt",
    "microservices/predictions-service/README.md",
    "start-all-services.bat",
    "start-all-services.sh",
    "docker-compose.yml",
    "verify-services.py",
    "test-integration.py",
    "frontend-integration-example.js",
]


def make_exists(paths):
    normalized = {Path(path).as_posix() for path in paths}

    def _exists(self):
        return self.as_posix() in normalized

    return _exists


def make_read_text(mapping):
    normalized = {Path(key).as_posix(): value for key, value in mapping.items()}

    def _read_text(self, *args, **kwargs):
        key = self.as_posix()
        if key not in normalized:
            raise FileNotFoundError(f"Unexpected path requested: {key}")
        return normalized[key]

    return _read_text


class CheckMicroserviceIntegrationTests(unittest.TestCase):
    def test_check_file_structure_all_present(self):
        with patch.object(integration.Path, "exists", new=make_exists(REQUIRED_FILES)):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_file_structure()
        self.assertTrue(result)

    def test_check_file_structure_missing_files(self):
        present_files = REQUIRED_FILES[:-1]
        with patch.object(integration.Path, "exists", new=make_exists(present_files)):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_file_structure()
        self.assertFalse(result)

    def test_check_microservice_config_success(self):
        app_path = "microservices/predictions-service/app.py"
        content = """
DB_NAME=urbanflow_db
from flask_cors import CORS
def create_app():
    CORS(app)
@app.get('/api/v1/health')
@app.get('/api/v1/sensors/{sensor_id}/historical')
@app.post('/api/v1/sensors/{sensor_id}/predict')
@app.get('/api/v1/sensors/{sensor_id}/stats')
@app.get('/api/v1/system/overview')
@app.get('/api/v1/sensors')
"""
        with patch.object(integration.Path, "exists", new=make_exists([app_path])):
            with patch.object(integration.Path, "read_text", new=make_read_text({app_path: content})):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_microservice_config()
        self.assertTrue(result)

    def test_check_microservice_config_missing_app_file(self):
        with patch.object(integration.Path, "exists", new=make_exists([])):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_microservice_config()
        self.assertFalse(result)

    def test_check_microservice_config_missing_endpoint(self):
        app_path = "microservices/predictions-service/app.py"
        incomplete = """
DB_NAME=urbanflow_db
CORS(app)
@app.get('/api/v1/health')
"""
        with patch.object(integration.Path, "exists", new=make_exists([app_path])):
            with patch.object(integration.Path, "read_text", new=make_read_text({app_path: incomplete})):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_microservice_config()
        self.assertFalse(result)

    def test_check_integration_scripts_success(self):
        paths = ["start-all-services.bat", "docker-compose.yml"]
        mapping = {
            "start-all-services.bat": "predictions-service\n3001",
            "docker-compose.yml": "services:\n  predictions:\n    ports:\n      - '3001:3001'",
        }
        with patch.object(integration.Path, "exists", new=make_exists(paths)):
            with patch.object(integration.Path, "read_text", new=make_read_text(mapping)):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_integration_scripts()
        self.assertTrue(result)

    def test_check_integration_scripts_missing_start_script(self):
        with patch.object(integration.Path, "exists", new=make_exists(["docker-compose.yml"])):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_integration_scripts()
        self.assertFalse(result)

    def test_check_frontend_integration_success(self):
        frontend_path = "frontend-integration-example.js"
        mapping = {frontend_path: "fetch('http://localhost:3001/api/v1/health')"}
        with patch.object(integration.Path, "exists", new=make_exists([frontend_path])):
            with patch.object(integration.Path, "read_text", new=make_read_text(mapping)):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_frontend_integration()
        self.assertTrue(result)

    def test_check_documentation_missing_doc(self):
        docs_present = ["INTEGRATION.md", "MICROSERVICES_SUMMARY.md"]
        with patch.object(integration.Path, "exists", new=make_exists(docs_present)):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_documentation()
        self.assertFalse(result)

    def test_check_documentation_success(self):
        docs_present = [
            "INTEGRATION.md",
            "MICROSERVICES_SUMMARY.md",
            "microservices/predictions-service/README.md",
        ]
        with patch.object(integration.Path, "exists", new=make_exists(docs_present)):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_documentation()
        self.assertTrue(result)

    def test_main_all_success(self):
        with patch.object(integration, "check_file_structure", return_value=True), \
            patch.object(integration, "check_microservice_config", return_value=True), \
            patch.object(integration, "check_integration_scripts", return_value=True), \
            patch.object(integration, "check_frontend_integration", return_value=True), \
            patch.object(integration, "check_documentation", return_value=True), \
            patch.object(integration, "generate_integration_summary") as summary:
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.main()
        output = stdout.getvalue()
        self.assertTrue(result)
        self.assertIn("RESULTADOS DE VERIFICACIÓN", output)
        summary.assert_called_once()

    def test_check_integration_scripts_missing_docker_compose(self):
        mapping = {"start-all-services.bat": "predictions-service\n3001"}
        with patch.object(integration.Path, "exists", new=make_exists(["start-all-services.bat"])):
            with patch.object(integration.Path, "read_text", new=make_read_text(mapping)):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_integration_scripts()
        self.assertFalse(result)

    def test_check_integration_scripts_wrong_port(self):
        paths = ["start-all-services.bat", "docker-compose.yml"]
        mapping = {
            "start-all-services.bat": "predictions-service\n3001",
            "docker-compose.yml": "services:\n  predictions:\n    ports:\n      - '3002:3001'",
        }
        with patch.object(integration.Path, "exists", new=make_exists(paths)):
            with patch.object(integration.Path, "read_text", new=make_read_text(mapping)):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_integration_scripts()
        self.assertFalse(result)

    def test_check_frontend_integration_missing_file(self):
        with patch.object(integration.Path, "exists", new=make_exists([])):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.check_frontend_integration()
        self.assertFalse(result)

    def test_check_frontend_integration_wrong_url(self):
        frontend_path = "frontend-integration-example.js"
        mapping = {frontend_path: "fetch('http://localhost:4000/api/v1/health')"}
        with patch.object(integration.Path, "exists", new=make_exists([frontend_path])):
            with patch.object(integration.Path, "read_text", new=make_read_text(mapping)):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_frontend_integration()
        self.assertFalse(result)

    def test_check_microservice_config_missing_db_config(self):
        app_path = "microservices/predictions-service/app.py"
        content = """
from flask_cors import CORS
def create_app():
    CORS(app)
@app.get('/api/v1/health')
@app.get('/api/v1/sensors/{sensor_id}/historical')
@app.post('/api/v1/sensors/{sensor_id}/predict')
@app.get('/api/v1/sensors/{sensor_id}/stats')
@app.get('/api/v1/system/overview')
@app.get('/api/v1/sensors')
"""
        with patch.object(integration.Path, "exists", new=make_exists([app_path])):
            with patch.object(integration.Path, "read_text", new=make_read_text({app_path: content})):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_microservice_config()
        self.assertFalse(result)

    def test_check_microservice_config_missing_cors(self):
        app_path = "microservices/predictions-service/app.py"
        content = """
DB_NAME=urbanflow_db
def create_app():
    pass
@app.get('/api/v1/health')
@app.get('/api/v1/sensors/{sensor_id}/historical')
@app.post('/api/v1/sensors/{sensor_id}/predict')
@app.get('/api/v1/sensors/{sensor_id}/stats')
@app.get('/api/v1/system/overview')
@app.get('/api/v1/sensors')
"""
        with patch.object(integration.Path, "exists", new=make_exists([app_path])):
            with patch.object(integration.Path, "read_text", new=make_read_text({app_path: content})):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_microservice_config()
        self.assertFalse(result)

    def test_check_microservice_config_read_text_error(self):
        app_path = "microservices/predictions-service/app.py"
        with patch.object(integration.Path, "exists", new=make_exists([app_path])):
            with patch.object(integration.Path, "read_text", side_effect=RuntimeError("boom")):
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    result = integration.check_microservice_config()
        self.assertFalse(result)

    def test_main_partial_failure(self):
        with patch.object(integration, "check_file_structure", return_value=True), \
            patch.object(integration, "check_microservice_config", return_value=False), \
            patch.object(integration, "check_integration_scripts", return_value=True), \
            patch.object(integration, "check_frontend_integration", return_value=True), \
            patch.object(integration, "check_documentation", return_value=True), \
            patch.object(integration, "generate_integration_summary") as summary:
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = integration.main()
        output = stdout.getvalue()
        self.assertFalse(result)
        self.assertIn("FALLÓ", output)
        summary.assert_not_called()

    def test_generate_integration_summary_output(self):
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            integration.generate_integration_summary()
        output = stdout.getvalue()
        self.assertIn("RESUMEN DE INTEGRACIÓN", output)
        self.assertIn("URLs de servicios", output)
        self.assertIn("Frontend: http://localhost:5173", output)


if __name__ == "__main__":
    unittest.main()

