from flask import Flask, render_template, request, redirect, url_for, flash
import sqlite3
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key' # ¡CAMBIA ESTO EN UN ENTORNO DE PRODUCCIÓN!

DATABASE = '/root/main/finanzas_personales/app_finanzas/finanzas.db'

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
            recurrencia TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monto REAL NOT NULL,
            descripcion TEXT NOT NULL,
            categoria TEXT NOT NULL,
            fecha TEXT NOT NULL,
            recurrencia TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metas_ahorro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            monto_objetivo REAL NOT NULL,
            monto_actual REAL DEFAULT 0.0,
            fecha_limite TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deudas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            monto_total REAL NOT NULL,
            monto_pagado REAL DEFAULT 0.0,
            fecha_inicio TEXT NOT NULL,
            fecha_fin_estimada TEXT
        )
    """)
    conn.commit()
    conn.close()

@app.route('/')
def index():
    conn = get_db_connection()
    ingresos = conn.execute('SELECT * FROM ingresos ORDER BY fecha DESC').fetchall()
    gastos = conn.execute('SELECT * FROM gastos ORDER BY fecha DESC').fetchall()
    metas = conn.execute('SELECT * FROM metas_ahorro').fetchall()
    deudas = conn.execute('SELECT * FROM deudas').fetchall()
    conn.close()
    return render_template('index.html', ingresos=ingresos, gastos=gastos, metas=metas, deudas=deudas)

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
    return render_template('agregar_ingreso.html')

@app.route('/agregar_gasto', methods=('GET', 'POST'))
def agregar_gasto():
    if request.method == 'POST':
        monto = request.form['monto']
        descripcion = request.form['descripcion']
        categoria = request.form['categoria']
        fecha = request.form['fecha']
        recurrencia = request.form['recurrencia']

        if not monto or not descripcion or not categoria or not fecha:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn = get_db_connection()
            conn.execute('INSERT INTO gastos (monto, descripcion, categoria, fecha, recurrencia) VALUES (?, ?, ?, ?, ?)',
                         (monto, descripcion, categoria, fecha, recurrencia))
            conn.commit()
            conn.close()
            flash('Gasto agregado exitosamente!', 'success')
            return redirect(url_for('index'))
    return render_template('agregar_gasto.html')

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
    return render_template('agregar_meta.html')

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
    return render_template('agregar_deuda.html')

# Rutas para editar y eliminar
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
    return render_template('editar_gasto.html', gasto=gasto)

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
