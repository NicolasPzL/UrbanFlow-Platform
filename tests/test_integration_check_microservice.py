import importlib.util
import os
import subprocess
import sys
import textwrap
from contextlib import contextmanager
from pathlib import Path

import pytest  # type: ignore


MODULE_PATH = Path(__file__).resolve().parents[1] / "check-microservice-integration.py"

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
    "INTEGRATION.md",
    "MICROSERVICES_SUMMARY.md",
    "microservices/predictions-service/README.md",
]


def load_module():
    spec = importlib.util.spec_from_file_location("check_microservice_integration", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_file(base_path: Path, relative_path: str, content: str = ""):
    file_path = base_path / relative_path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(textwrap.dedent(content), encoding="utf-8")
    return file_path


def overwrite_file(base_path: Path, relative_path: str, content: str = ""):
    return write_file(base_path, relative_path, content)


def create_success_environment(base_path: Path):
    write_file(
        base_path,
        "microservices/predictions-service/app.py",
        """
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
        """,
    )
    write_file(base_path, "start-all-services.bat", "predictions-service\n3001\n")
    write_file(base_path, "start-all-services.sh", "echo start predictions-service\n")
    write_file(
        base_path,
        "docker-compose.yml",
        """
        services:
          predictions:
            ports:
              - "3001:3001"
        """,
    )
    write_file(base_path, "verify-services.py")
    write_file(base_path, "test-integration.py")
    write_file(base_path, "microservices/predictions-service/requirements.txt")
    write_file(base_path, "frontend-integration-example.js", "fetch('http://localhost:3001/api/v1/health')")
    write_file(base_path, "INTEGRATION.md")
    write_file(base_path, "MICROSERVICES_SUMMARY.md")
    write_file(base_path, "microservices/predictions-service/README.md")


@contextmanager
def change_dir(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


def run_cli(tmp_path: Path):
    env = os.environ.copy()
    env.setdefault("PYTHONIOENCODING", "utf-8")
    return subprocess.run(
        [sys.executable, str(MODULE_PATH)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )


def test_main_success_pytest(tmp_path, capsys):
    create_success_environment(tmp_path)
    module = load_module()
    with change_dir(tmp_path):
        result = module.main()
    captured = capsys.readouterr()
    assert result is True
    assert "RESULTADOS DE VERIFICACIÓN" in captured.out
    assert "¡INTEGRACIÓN COMPLETAMENTE CONFIGURADA!" in captured.out


def test_main_failure_missing_doc(tmp_path, capsys):
    create_success_environment(tmp_path)
    # Eliminar un documento requerido para provocar el fallo
    (tmp_path / "MICROSERVICES_SUMMARY.md").unlink()
    module = load_module()
    with change_dir(tmp_path):
        result = module.main()
    captured = capsys.readouterr()
    assert result is False
    assert "Documentación" in captured.out
    assert "FALLÓ" in captured.out


def test_cli_success(tmp_path):
    create_success_environment(tmp_path)
    result = run_cli(tmp_path)
    assert result.returncode == 0
    assert "INTEGRACIÓN COMPLETAMENTE CONFIGURADA" in result.stdout


def test_cli_failure(tmp_path):
    create_success_environment(tmp_path)
    # Remover el archivo de Docker Compose para forzar un fallo
    (tmp_path / "docker-compose.yml").unlink()
    result = run_cli(tmp_path)
    assert result.returncode == 1
    assert "Docker Compose" in result.stdout


def test_check_file_structure_success_integration(tmp_path):
    create_success_environment(tmp_path)
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_file_structure() is True


def test_check_file_structure_missing_file_integration(tmp_path):
    create_success_environment(tmp_path)
    (tmp_path / "verify-services.py").unlink()
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_file_structure() is False


def test_check_microservice_config_success_integration(tmp_path):
    create_success_environment(tmp_path)
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_microservice_config() is True


def test_check_microservice_config_missing_endpoint_integration(tmp_path):
    create_success_environment(tmp_path)
    overwrite_file(
        tmp_path,
        "microservices/predictions-service/app.py",
        """
        DB_NAME=urbanflow_db
        from flask_cors import CORS
        def create_app():
            CORS(app)
        @app.get('/api/v1/health')
        """,
    )
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_microservice_config() is False


def test_check_microservice_config_missing_db_integration(tmp_path):
    create_success_environment(tmp_path)
    overwrite_file(
        tmp_path,
        "microservices/predictions-service/app.py",
        """
        from flask_cors import CORS
        def create_app():
            CORS(app)
        @app.get('/api/v1/health')
        @app.get('/api/v1/sensors/{sensor_id}/historical')
        @app.post('/api/v1/sensors/{sensor_id}/predict')
        @app.get('/api/v1/sensors/{sensor_id}/stats')
        @app.get('/api/v1/system/overview')
        @app.get('/api/v1/sensors')
        """,
    )
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_microservice_config() is False


def test_check_microservice_config_missing_cors_integration(tmp_path):
    create_success_environment(tmp_path)
    overwrite_file(
        tmp_path,
        "microservices/predictions-service/app.py",
        """
        DB_NAME=urbanflow_db
        def create_app():
            pass
        @app.get('/api/v1/health')
        @app.get('/api/v1/sensors/{sensor_id}/historical')
        @app.post('/api/v1/sensors/{sensor_id}/predict')
        @app.get('/api/v1/sensors/{sensor_id}/stats')
        @app.get('/api/v1/system/overview')
        @app.get('/api/v1/sensors')
        """,
    )
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_microservice_config() is False


def test_check_integration_scripts_success_integration(tmp_path):
    create_success_environment(tmp_path)
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_integration_scripts() is True


def test_check_integration_scripts_missing_start_script_integration(tmp_path):
    create_success_environment(tmp_path)
    (tmp_path / "start-all-services.bat").unlink()
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_integration_scripts() is False


def test_check_integration_scripts_wrong_port_integration(tmp_path):
    create_success_environment(tmp_path)
    overwrite_file(
        tmp_path,
        "docker-compose.yml",
        """
        services:
          predictions:
            ports:
              - "3002:3001"
        """,
    )
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_integration_scripts() is False


def test_check_frontend_integration_missing_file_integration(tmp_path):
    create_success_environment(tmp_path)
    (tmp_path / "frontend-integration-example.js").unlink()
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_frontend_integration() is False


def test_check_frontend_integration_wrong_url_integration(tmp_path):
    create_success_environment(tmp_path)
    overwrite_file(
        tmp_path,
        "frontend-integration-example.js",
        "fetch('http://localhost:4000/api/v1/health')",
    )
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_frontend_integration() is False


def test_check_documentation_missing_doc_integration(tmp_path):
    create_success_environment(tmp_path)
    (tmp_path / "INTEGRATION.md").unlink()
    module = load_module()
    with change_dir(tmp_path):
        assert module.check_documentation() is False


def test_main_failure_missing_start_script_pytest(tmp_path, capsys):
    create_success_environment(tmp_path)
    (tmp_path / "start-all-services.bat").unlink()
    module = load_module()
    with change_dir(tmp_path):
        result = module.main()
    captured = capsys.readouterr()
    assert result is False
    assert "Scripts de integración" in captured.out
    assert "FALLÓ" in captured.out


def test_main_failure_missing_frontend_pytest(tmp_path, capsys):
    create_success_environment(tmp_path)
    (tmp_path / "frontend-integration-example.js").unlink()
    module = load_module()
    with change_dir(tmp_path):
        result = module.main()
    captured = capsys.readouterr()
    assert result is False
    assert "Integración con frontend" in captured.out
    assert "FALLÓ" in captured.out


def test_cli_failure_missing_requirements(tmp_path):
    create_success_environment(tmp_path)
    (tmp_path / "microservices/predictions-service/requirements.txt").unlink()
    result = run_cli(tmp_path)
    assert result.returncode == 1
    assert "Estructura de archivos" in result.stdout


def test_cli_failure_missing_app(tmp_path):
    create_success_environment(tmp_path)
    (tmp_path / "microservices/predictions-service/app.py").unlink()
    result = run_cli(tmp_path)
    assert result.returncode == 1
    assert "Configuración del microservicio" in result.stdout

