def importTableFromDb(tablename):
    import importlib.util
    import os
    import subprocess
    import sys
    from pathlib import Path
    from urllib.parse import quote_plus

    import numpy as np
    import pandas as pd
    from sqlalchemy import create_engine
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler

    if importlib.util.find_spec('pyodbc') is None:
        print('pyodbc not found in this kernel. Installing now...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyodbc'])

    import pyodbc


    def parse_dotnet_connection_string(conn_str: str) -> dict[str, str]:
        parts: dict[str, str] = {}
        for chunk in conn_str.split(';'):
            piece = chunk.strip()
            if not piece or '=' not in piece:
                continue
            key, value = piece.split('=', 1)
            parts[key.strip().lower()] = value.strip()
        return parts


    def normalize_odbc_bool(value: str | None, default: str = 'no') -> str:
        if value is None or str(value).strip() == '':
            return default
        val = str(value).strip().strip('"').strip("'").lower()
        if val in {'true', '1', 'yes', 'y', 'on', 'mandatory', 'strict'}:
            return 'yes'
        if val in {'false', '0', 'no', 'n', 'off', 'optional'}:
            return 'no'
        return default


    def pick_sql_server_odbc_driver() -> str:
        drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
        preferred = ['ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server']
        for name in preferred:
            if name in drivers:
                return name
        if drivers:
            return drivers[-1]
        raise RuntimeError(
            'No SQL Server ODBC driver found. Install ODBC Driver 18 for SQL Server on this machine.'
        )


    def load_app_connection_string() -> str:
        env_value = os.getenv('ConnectionStrings__AppConnection')
        if env_value:
            return env_value.strip()

        roots = [Path.cwd().resolve(), *Path.cwd().resolve().parents]
        candidate_paths: list[Path] = []

        for root in roots:
            candidate_paths.append(root / '.env')
            candidate_paths.append(root / 'backend' / 'Intex.API' / '.env')

        seen: set[Path] = set()
        deduped_paths: list[Path] = []
        for p in candidate_paths:
            if p in seen:
                continue
            seen.add(p)
            deduped_paths.append(p)

        for env_path in deduped_paths:
            if not env_path.exists():
                continue
            for raw_line in env_path.read_text(encoding='utf-8').splitlines():
                line = raw_line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                if key.strip() == 'ConnectionStrings__AppConnection':
                    return value.strip().strip('"').strip("'")

        checked = '\n'.join(str(p) for p in deduped_paths)
        raise ValueError(
            'ConnectionStrings__AppConnection was not found. Checked these paths:\n' + checked
        )


    def build_sqlalchemy_mssql_url(dotnet_conn_str: str) -> str:
        parts = parse_dotnet_connection_string(dotnet_conn_str)
        driver = pick_sql_server_odbc_driver()

        server = parts.get('server', '')
        if server.lower().startswith('tcp:'):
            server = server[4:]

        encrypt = normalize_odbc_bool(parts.get('encrypt'), default='yes')
        trust_server_cert = normalize_odbc_bool(parts.get('trustservercertificate'), default='no')

        odbc_str = (
            f'DRIVER={{{driver}}};'
            f"SERVER={server};"
            f"DATABASE={parts.get('initial catalog', '')};"
            f"UID={parts.get('user id', '')};"
            f"PWD={parts.get('password', '')};"
            f"Encrypt={encrypt};"
            f"TrustServerCertificate={trust_server_cert};"
            f"Connection Timeout={parts.get('connection timeout', '30')};"
        )

        return f'mssql+pyodbc:///?odbc_connect={quote_plus(odbc_str)}'


    app_conn_str = load_app_connection_string()
    engine = create_engine(build_sqlalchemy_mssql_url(app_conn_str))

    df = pd.read_sql_query(
        """
        SELECT
            *
        FROM """ + tablename
        ,
        engine,
        )

    return df


def update_supporter_likely_churn(predictions_df, table_name='dbo.supporters'):
    import importlib.util
    import os
    import subprocess
    import sys
    from pathlib import Path
    from urllib.parse import quote_plus

    import pandas as pd
    from sqlalchemy import create_engine, text

    if importlib.util.find_spec('pyodbc') is None:
        print('pyodbc not found in this kernel. Installing now...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyodbc'])

    import pyodbc


    def parse_dotnet_connection_string(conn_str: str) -> dict[str, str]:
        parts: dict[str, str] = {}
        for chunk in conn_str.split(';'):
            piece = chunk.strip()
            if not piece or '=' not in piece:
                continue
            key, value = piece.split('=', 1)
            parts[key.strip().lower()] = value.strip()
        return parts


    def normalize_odbc_bool(value: str | None, default: str = 'no') -> str:
        if value is None or str(value).strip() == '':
            return default
        val = str(value).strip().strip('"').strip("'").lower()
        if val in {'true', '1', 'yes', 'y', 'on', 'mandatory', 'strict'}:
            return 'yes'
        if val in {'false', '0', 'no', 'n', 'off', 'optional'}:
            return 'no'
        return default


    def pick_sql_server_odbc_driver() -> str:
        drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
        preferred = ['ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server']
        for name in preferred:
            if name in drivers:
                return name
        if drivers:
            return drivers[-1]
        raise RuntimeError(
            'No SQL Server ODBC driver found. Install ODBC Driver 18 for SQL Server on this machine.'
        )


    def load_app_connection_string() -> str:
        env_value = os.getenv('ConnectionStrings__AppConnection')
        if env_value:
            return env_value.strip()

        roots = [Path.cwd().resolve(), *Path.cwd().resolve().parents]
        candidate_paths: list[Path] = []

        for root in roots:
            candidate_paths.append(root / '.env')
            candidate_paths.append(root / 'backend' / 'Intex.API' / '.env')

        seen: set[Path] = set()
        deduped_paths: list[Path] = []
        for p in candidate_paths:
            if p in seen:
                continue
            seen.add(p)
            deduped_paths.append(p)

        for env_path in deduped_paths:
            if not env_path.exists():
                continue
            for raw_line in env_path.read_text(encoding='utf-8').splitlines():
                line = raw_line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                if key.strip() == 'ConnectionStrings__AppConnection':
                    return value.strip().strip('"').strip("'")

        checked = '\n'.join(str(p) for p in deduped_paths)
        raise ValueError(
            'ConnectionStrings__AppConnection was not found. Checked these paths:\n' + checked
        )


    def build_sqlalchemy_mssql_url(dotnet_conn_str: str) -> str:
        parts = parse_dotnet_connection_string(dotnet_conn_str)
        driver = pick_sql_server_odbc_driver()

        server = parts.get('server', '')
        if server.lower().startswith('tcp:'):
            server = server[4:]

        encrypt = normalize_odbc_bool(parts.get('encrypt'), default='yes')
        trust_server_cert = normalize_odbc_bool(parts.get('trustservercertificate'), default='no')

        odbc_str = (
            f'DRIVER={{{driver}}};'
            f"SERVER={server};"
            f"DATABASE={parts.get('initial catalog', '')};"
            f"UID={parts.get('user id', '')};"
            f"PWD={parts.get('password', '')};"
            f"Encrypt={encrypt};"
            f"TrustServerCertificate={trust_server_cert};"
            f"Connection Timeout={parts.get('connection timeout', '30')};"
        )

        return f'mssql+pyodbc:///?odbc_connect={quote_plus(odbc_str)}'


    if not isinstance(predictions_df, pd.DataFrame):
        raise TypeError('predictions_df must be a pandas DataFrame')

    required = {'supporter_id', 'likely_churn'}
    missing = required.difference(predictions_df.columns)
    if missing:
        raise ValueError(f'Missing required columns: {sorted(missing)}')

    has_probability = 'churn_probability' in predictions_df.columns

    selected_cols = ['supporter_id', 'likely_churn']
    if has_probability:
        selected_cols.append('churn_probability')

    updates = predictions_df[selected_cols].dropna(subset=['supporter_id']).copy()
    if updates.empty:
        return 0

    updates['supporter_id'] = pd.to_numeric(updates['supporter_id'], errors='coerce')
    updates = updates.dropna(subset=['supporter_id'])
    updates['supporter_id'] = updates['supporter_id'].astype(int)
    updates['likely_churn'] = updates['likely_churn'].astype(bool).astype(int)
    if has_probability:
        updates['churn_probability'] = pd.to_numeric(updates['churn_probability'], errors='coerce')
        updates['churn_probability'] = updates['churn_probability'].fillna(0).round(3).astype(float)

    # Keep one row per supporter if duplicates are passed.
    updates = updates.drop_duplicates(subset=['supporter_id'], keep='last')

    app_conn_str = load_app_connection_string()
    engine = create_engine(build_sqlalchemy_mssql_url(app_conn_str))

    records = updates.to_dict(orient='records')
    with engine.begin() as connection:
        if has_probability:
            for record in records:
                supporter_id = int(record['supporter_id'])
                likely_churn = int(record['likely_churn'])
                churn_probability = float(record['churn_probability'])
                connection.exec_driver_sql(
                    f"""
                    UPDATE {table_name}
                    SET likely_churn = {likely_churn},
                        churn_probability = {churn_probability:.3f}
                    WHERE supporter_id = {supporter_id}
                    """
                )
        else:
            stmt = text(
                f"""
                UPDATE {table_name}
                SET likely_churn = :likely_churn
                WHERE supporter_id = :supporter_id
                """
            )
            for record in records:
                connection.execute(stmt, record)

    return len(records)