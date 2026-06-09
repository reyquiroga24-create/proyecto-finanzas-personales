from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
import sqlite3
from datetime import datetime, date
import os
import json
import io
import csv
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'finanzas_personales_secret_key_2026'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'static', 'comprobantes')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

DATABASE = os.path.join(os.path.dirname(__file__), 'finanzas.db')

# Colores para categorias
CATEGORIAS = {
    'Alimentacion': '#e74c3c',
    'Transporte': '#3498db',
    'Vivienda': '#9b59b6',
    'Entretenimiento': '#f39c12',
    'Salud': '#27ae60',
    'Educacion': '#1abc9c',
    'Ropa': '#e67e22',
    'Servicios': '#34495e',
    'Otros': '#95a5a6'
}

MESES_ES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

DIAS_ES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

def fecha_legible(fecha_str):
    """Convierte 2026-06-09 a '9 de Junio, 2026'"""
    try:
        f = datetime.strptime(fecha_str, '%Y-%m-%d')
        hoy = date.today()
        f_date = f.date()
        if f_date == hoy:
            return 'Hoy'
        delta = (hoy - f_date).days
        if delta == 1:
            return 'Ayer'
        if delta < 7:
            dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
            return dias[f.weekday()]
        return f"{f.day} de {MESES_ES[f.month]}, {f.year}"
    except:
        return fecha_str

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ingresos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monto REAL NOT NULL,
            descripcion TEXT NOT NULL,
            fecha TEXT NOT NULL,
            recurrencia TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monto REAL NOT NULL,
            descripcion TEXT NOT NULL,
            categoria TEXT NOT NULL,
            fecha TEXT NOT NULL,
            recurrencia TEXT,
            comprobante TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metas_ahorro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            monto_objetivo REAL NOT NULL,
            monto_actual REAL DEFAULT 0.0,
            fecha_limite TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deudas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            monto_total REAL NOT NULL,
            monto_pagado REAL DEFAULT 0.0,
            fecha_inicio TEXT NOT NULL,
            fecha_fin_estimada TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

@app.route('/')
def index():
    conn = get_db_connection()
    ingresos = conn.execute('SELECT * FROM ingresos ORDER BY fecha DESC').fetchall()
    gastos = conn.execute('SELECT * FROM gastos ORDER BY fecha DESC').fetchall()
    metas = conn.execute('SELECT * FROM metas_ahorro ORDER BY fecha_limite ASC').fetchall()
    deudas = conn.execute('SELECT * FROM deudas ORDER BY fecha_inicio DESC').fetchall()

    # Dashboard - Resumen
    hoy = date.today()
    mes_actual = f"{hoy.year}-{hoy.month:02d}"

    total_ingresos_mes = conn.execute(
        "SELECT COALESCE(SUM(monto), 0) FROM ingresos WHERE strftime('%Y-%m', fecha) = ?",
        (mes_actual,)).fetchone()[0]
    total_gastos_mes = conn.execute(
        "SELECT COALESCE(SUM(monto), 0) FROM gastos WHERE strftime('%Y-%m', fecha) = ?",
        (mes_actual,)).fetchone()[0]
    balance = total_ingresos_mes - total_gastos_mes

    # Gastos por categoria (grafico)
    gastos_categoria = conn.execute(
        "SELECT categoria, SUM(monto) as total FROM gastos WHERE strftime('%Y-%m', fecha) = ? GROUP BY categoria ORDER BY total DESC",
        (mes_actual,)).fetchall()

    # Totales generales
    total_ingresos = conn.execute("SELECT COALESCE(SUM(monto), 0) FROM ingresos").fetchone()[0]
    total_gastos = conn.execute("SELECT COALESCE(SUM(monto), 0) FROM gastos").fetchone()[0]
    total_metas = conn.execute("SELECT COALESCE(SUM(monto_objetivo), 0) FROM metas_ahorro").fetchone()[0]
    total_ahorrado = conn.execute("SELECT COALESCE(SUM(monto_actual), 0) FROM metas_ahorro").fetchone()[0]
    total_deudas = conn.execute("SELECT COALESCE(SUM(monto_total), 0) FROM deudas").fetchone()[0]
    total_pagado = conn.execute("SELECT COALESCE(SUM(monto_pagado), 0) FROM deudas").fetchone()[0]

    conn.close()

    return render_template('index.html',
                         ingresos=ingresos, gastos=gastos, metas=metas, deudas=deudas,
                         fecha_legible=fecha_legible,
                         total_ingresos_mes=total_ingresos_mes,
                         total_gastos_mes=total_gastos_mes,
                         balance=balance,
                         gastos_categoria=gastos_categoria,
                         categorias=CATEGORIAS,
                         total_ingresos=total_ingresos,
                         total_gastos=total_gastos,
                         total_metas=total_metas,
                         total_ahorrado=total_ahorrado,
                         total_deudas=total_deudas,
                         total_pagado=total_pagado,
                         mes_actual=f"{MESES_ES[hoy.month]} {hoy.year}")

# ---- API para graficos ----
@app.route('/api/gastos_categoria')
def api_gastos_categoria():
    conn = get_db_connection()
    hoy = date.today()
    mes_actual = f"{hoy.year}-{hoy.month:02d}"
    data = conn.execute(
        "SELECT categoria, SUM(monto) as total FROM gastos WHERE strftime('%Y-%m', fecha) = ? GROUP BY categoria ORDER BY total DESC",
        (mes_actual,)).fetchall()
    conn.close()
    return jsonify([{'categoria': r['categoria'], 'total': r['total'], 'color': CATEGORIAS.get(r['categoria'], '#95a5a6')} for r in data])

@app.route('/api/evolucion')
def api_evolucion():
    conn = get_db_connection()
    data = conn.execute("""
        SELECT strftime('%Y-%m', fecha) as mes,
               SUM(CASE WHEN 'ingresos' = 'ingresos' THEN monto ELSE 0 END) as ingresos,
               SUM(CASE WHEN 'gastos' = 'gastos' THEN monto ELSE 0 END) as gastos
        FROM (
            SELECT fecha, monto, 'ingresos' as tipo FROM ingresos
            UNION ALL
            SELECT fecha, monto, 'gastos' as tipo FROM gastos
        ) GROUP BY mes ORDER BY mes
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in data])

# ---- Exportar ----
@app.route('/exportar/<tipo>')
def exportar(tipo):
    conn = get_db_connection()
    if tipo == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Tipo', 'Monto', 'Descripcion', 'Categoria', 'Fecha', 'Recurrencia'])
        for r in conn.execute("SELECT 'Ingreso' as tipo, monto, descripcion, '' as categoria, fecha, recurrencia FROM ingresos").fetchall():
            writer.writerow([r['tipo'], r['monto'], r['descripcion'], r['categoria'], r['fecha'], r['recurrencia']])
        for r in conn.execute("SELECT 'Gasto' as tipo, monto, descripcion, categoria, fecha, recurrencia FROM gastos").fetchall():
            writer.writerow([r['tipo'], r['monto'], r['descripcion'], r['categoria'], r['fecha'], r['recurrencia']])
        conn.close()
        mem = io.BytesIO()
        mem.write(output.getvalue().encode('utf-8'))
        mem.seek(0)
        return send_file(mem, mimetype='text/csv', as_attachment=True, download_name=f'finanzas_{date.today().isoformat()}.csv')
    conn.close()
    flash('Formato no soportado', 'error')
    return redirect(url_for('index'))

# ---- Rutas CRUD existentes ----
@app.route('/agregar_ingreso', methods=('GET', 'POST'))
def agregar_ingreso():
    if request.method == 'POST':
        monto = request.form['monto']
        descripcion = request.form['descripcion']
        fecha = request.form['fecha']
        recurrencia = request.form['recurrencia']
        if not monto or not descripcion or not fecha:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn = get_db_connection()
            conn.execute('INSERT INTO ingresos (monto, descripcion, fecha, recurrencia) VALUES (?, ?, ?, ?)',
                         (monto, descripcion, fecha, recurrencia))
            conn.commit()
            conn.close()
            flash('Ingreso agregado exitosamente!', 'success')
            return redirect(url_for('index'))
    return render_template('agregar_ingreso.html', hoy=date.today().isoformat())

@app.route('/agregar_gasto', methods=('GET', 'POST'))
def agregar_gasto():
    if request.method == 'POST':
        monto = request.form['monto']
        descripcion = request.form['descripcion']
        categoria = request.form['categoria']
        fecha = request.form['fecha']
        recurrencia = request.form['recurrencia']
        comprobante = None

        # Subir comprobante
        if 'comprobante' in request.files:
            file = request.files['comprobante']
            if file and file.filename:
                ext = file.filename.rsplit('.', 1)[-1].lower()
                if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                    filename = f"gasto_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    comprobante = filename

        if not monto or not descripcion or not categoria or not fecha:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn = get_db_connection()
            conn.execute('INSERT INTO gastos (monto, descripcion, categoria, fecha, recurrencia, comprobante) VALUES (?, ?, ?, ?, ?, ?)',
                         (monto, descripcion, categoria, fecha, recurrencia, comprobante))
            conn.commit()
            conn.close()
            flash('Gasto agregado exitosamente!', 'success')
            return redirect(url_for('index'))
    return render_template('agregar_gasto.html', categorias=CATEGORIAS, hoy=date.today().isoformat())

@app.route('/agregar_meta', methods=('GET', 'POST'))
def agregar_meta():
    if request.method == 'POST':
        nombre = request.form['nombre']
        monto_objetivo = request.form['monto_objetivo']
        fecha_limite = request.form['fecha_limite']
        if not nombre or not monto_objetivo or not fecha_limite:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn = get_db_connection()
            conn.execute('INSERT INTO metas_ahorro (nombre, monto_objetivo, fecha_limite) VALUES (?, ?, ?)',
                         (nombre, monto_objetivo, fecha_limite))
            conn.commit()
            conn.close()
            flash('Meta de ahorro agregada exitosamente!', 'success')
            return redirect(url_for('index'))
    return render_template('agregar_meta.html', hoy=date.today().isoformat())

@app.route('/agregar_deuda', methods=('GET', 'POST'))
def agregar_deuda():
    if request.method == 'POST':
        nombre = request.form['nombre']
        monto_total = request.form['monto_total']
        fecha_inicio = request.form['fecha_inicio']
        fecha_fin_estimada = request.form['fecha_fin_estimada']
        if not nombre or not monto_total or not fecha_inicio:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn = get_db_connection()
            conn.execute('INSERT INTO deudas (nombre, monto_total, fecha_inicio, fecha_fin_estimada) VALUES (?, ?, ?, ?)',
                         (nombre, monto_total, fecha_inicio, fecha_fin_estimada))
            conn.commit()
            conn.close()
            flash('Deuda agregada exitosamente!', 'success')
            return redirect(url_for('index'))
    return render_template('agregar_deuda.html', hoy=date.today().isoformat())

# ---- Editar y eliminar ----
@app.route('/editar_ingreso/<int:id>', methods=('GET', 'POST'))
def editar_ingreso(id):
    conn = get_db_connection()
    ingreso = conn.execute('SELECT * FROM ingresos WHERE id = ?', (id,)).fetchone()
    if request.method == 'POST':
        monto = request.form['monto']
        descripcion = request.form['descripcion']
        fecha = request.form['fecha']
        recurrencia = request.form['recurrencia']
        if not monto or not descripcion or not fecha:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn.execute('UPDATE ingresos SET monto = ?, descripcion = ?, fecha = ?, recurrencia = ? WHERE id = ?',
                         (monto, descripcion, fecha, recurrencia, id))
            conn.commit()
            flash('Ingreso actualizado exitosamente!', 'success')
            return redirect(url_for('index'))
    conn.close()
    return render_template('editar_ingreso.html', ingreso=ingreso)

@app.route('/eliminar_ingreso/<int:id>', methods=('POST',))
def eliminar_ingreso(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM ingresos WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    flash('Ingreso eliminado exitosamente!', 'success')
    return redirect(url_for('index'))

@app.route('/editar_gasto/<int:id>', methods=('GET', 'POST'))
def editar_gasto(id):
    conn = get_db_connection()
    gasto = conn.execute('SELECT * FROM gastos WHERE id = ?', (id,)).fetchone()
    if request.method == 'POST':
        monto = request.form['monto']
        descripcion = request.form['descripcion']
        categoria = request.form['categoria']
        fecha = request.form['fecha']
        recurrencia = request.form['recurrencia']
        if not monto or not descripcion or not categoria or not fecha:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn.execute('UPDATE gastos SET monto = ?, descripcion = ?, categoria = ?, fecha = ?, recurrencia = ? WHERE id = ?',
                         (monto, descripcion, categoria, fecha, recurrencia, id))
            conn.commit()
            flash('Gasto actualizado exitosamente!', 'success')
            return redirect(url_for('index'))
    conn.close()
    return render_template('editar_gasto.html', gasto=gasto, categorias=CATEGORIAS)

@app.route('/eliminar_gasto/<int:id>', methods=('POST',))
def eliminar_gasto(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM gastos WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    flash('Gasto eliminado exitosamente!', 'success')
    return redirect(url_for('index'))

@app.route('/editar_meta/<int:id>', methods=('GET', 'POST'))
def editar_meta(id):
    conn = get_db_connection()
    meta = conn.execute('SELECT * FROM metas_ahorro WHERE id = ?', (id,)).fetchone()
    if request.method == 'POST':
        nombre = request.form['nombre']
        monto_objetivo = request.form['monto_objetivo']
        monto_actual = request.form['monto_actual']
        fecha_limite = request.form['fecha_limite']
        if not nombre or not monto_objetivo or not fecha_limite:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn.execute('UPDATE metas_ahorro SET nombre = ?, monto_objetivo = ?, monto_actual = ?, fecha_limite = ? WHERE id = ?',
                         (nombre, monto_objetivo, monto_actual, fecha_limite, id))
            conn.commit()
            flash('Meta de ahorro actualizada exitosamente!', 'success')
            return redirect(url_for('index'))
    conn.close()
    return render_template('editar_meta.html', meta=meta)

@app.route('/eliminar_meta/<int:id>', methods=('POST',))
def eliminar_meta(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM metas_ahorro WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    flash('Meta de ahorro eliminada exitosamente!', 'success')
    return redirect(url_for('index'))

@app.route('/editar_deuda/<int:id>', methods=('GET', 'POST'))
def editar_deuda(id):
    conn = get_db_connection()
    deuda = conn.execute('SELECT * FROM deudas WHERE id = ?', (id,)).fetchone()
    if request.method == 'POST':
        nombre = request.form['nombre']
        monto_total = request.form['monto_total']
        monto_pagado = request.form['monto_pagado']
        fecha_inicio = request.form['fecha_inicio']
        fecha_fin_estimada = request.form['fecha_fin_estimada']
        if not nombre or not monto_total or not fecha_inicio:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn.execute('UPDATE deudas SET nombre = ?, monto_total = ?, monto_pagado = ?, fecha_inicio = ?, fecha_fin_estimada = ? WHERE id = ?',
                         (nombre, monto_total, monto_pagado, fecha_inicio, fecha_fin_estimada, id))
            conn.commit()
            flash('Deuda actualizada exitosamente!', 'success')
            return redirect(url_for('index'))
    conn.close()
    return render_template('editar_deuda.html', deuda=deuda)

@app.route('/eliminar_deuda/<int:id>', methods=('POST',))
def eliminar_deuda(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM deudas WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    flash('Deuda eliminada exitosamente!', 'success')
    return redirect(url_for('index'))

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
