from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
import sqlite3
from datetime import datetime, date, timedelta
import os
import io
import csv
import math
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'finanzas_personales_secret_key_2026'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'static', 'comprobantes')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

DATABASE = os.path.join(os.path.dirname(__file__), 'finanzas.db')

PERFILES = [
    {'id': 'personal', 'nombre': 'Mis Gastos', 'icono': '👤'},
    {'id': 'hogar', 'nombre': 'Hogar', 'icono': '🏠'},
    {'id': 'resumen', 'nombre': 'Resumen', 'icono': '📊'},
]

CATEGORIAS = {
    'personal': {
        'Comida': '#e74c3c', 'Compras': '#3498db', 'Transporte': '#f39c12',
        'Entretenimiento': '#9b59b6', 'Salud': '#27ae60', 'Suscripciones': '#1abc9c',
        'Ropa': '#e67e22', 'Otros': '#95a5a6',
    },
    'hogar': {
        'Luz': '#f1c40f', 'Agua': '#3498db', 'Internet': '#e74c3c',
        'Celular': '#9b59b6', 'Renta': '#e67e22', 'Despensa': '#27ae60',
        'Mantenimiento': '#34495e', 'Gas': '#f39c12', 'Otros': '#95a5a6',
    }
}

MESES_ES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

def fecha_legible(f):
    try:
        d = datetime.strptime(f, '%Y-%m-%d')
        hoy = date.today()
        fd = d.date()
        if fd == hoy: return 'Hoy'
        if (hoy - fd).days == 1: return 'Ayer'
        if (hoy - fd).days < 7: return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][d.weekday()]
        return f"{d.day} de {MESES_ES[d.month]}, {d.year}"
    except: return f

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, perfil TEXT NOT NULL DEFAULT 'personal',
        monto REAL NOT NULL, descripcion TEXT NOT NULL, categoria TEXT NOT NULL,
        fecha TEXT NOT NULL, recurrencia TEXT DEFAULT '', comprobante TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS ingresos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL NOT NULL,
        descripcion TEXT NOT NULL, fecha TEXT NOT NULL, recurrencia TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS metas_ahorro (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
        monto_objetivo REAL NOT NULL, monto_actual REAL DEFAULT 0.0,
        fecha_limite TEXT NOT NULL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS deudas (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
        monto_total REAL NOT NULL, monto_pagado REAL DEFAULT 0.0,
        fecha_inicio TEXT NOT NULL, fecha_fin_estimada TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS presupuestos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, perfil TEXT NOT NULL,
        monto REAL NOT NULL, semana TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS pagos_programados (
        id INTEGER PRIMARY KEY AUTOINCREMENT, perfil TEXT NOT NULL DEFAULT 'hogar',
        nombre TEXT NOT NULL, monto REAL NOT NULL, categoria TEXT NOT NULL DEFAULT 'Servicio',
        dia_vencimiento INTEGER NOT NULL, recurrencia TEXT DEFAULT 'Mensual',
        activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    # Migrar columna perfil si no existe
    try:
        c.execute('ALTER TABLE gastos ADD COLUMN perfil TEXT NOT NULL DEFAULT "personal"')
    except: pass
    conn.commit()
    conn.close()

@app.route('/')
@app.route('/<perfil>')
def index(perfil='personal'):
    if perfil not in [p['id'] for p in PERFILES]:
        perfil = 'personal'

    conn = get_db()
    hoy = date.today()
    mes_actual_str = f"{hoy.year}-{hoy.month:02d}"
    # Numero de semana actual
    semana_actual = hoy.isocalendar()[1]
    anio_actual = hoy.year
    semana_key = f"{anio_actual}-S{semana_actual:02d}"

    # Datos comunes
    ingresos = conn.execute('SELECT * FROM ingresos ORDER BY fecha DESC').fetchall()
    metas = conn.execute('SELECT * FROM metas_ahorro ORDER BY fecha_limite ASC').fetchall()
    deudas = conn.execute('SELECT * FROM deudas ORDER BY fecha_inicio DESC').fetchall()

    # Totales ingresos
    total_ingresos_mes = conn.execute(
        "SELECT COALESCE(SUM(monto),0) FROM ingresos WHERE strftime('%Y-%m',fecha)=?",
        (mes_actual_str,)).fetchone()[0]
    total_ingresos = conn.execute("SELECT COALESCE(SUM(monto),0) FROM ingresos").fetchone()[0]
    total_metas = conn.execute("SELECT COALESCE(SUM(monto_objetivo),0) FROM metas_ahorro").fetchone()[0]
    total_ahorrado = conn.execute("SELECT COALESCE(SUM(monto_actual),0) FROM metas_ahorro").fetchone()[0]
    total_deudas = conn.execute("SELECT COALESCE(SUM(monto_total),0) FROM deudas").fetchone()[0]
    total_pagado = conn.execute("SELECT COALESCE(SUM(monto_pagado),0) FROM deudas").fetchone()[0]

    if perfil == 'personal':
        # Gastos del perfil
        gastos = conn.execute('SELECT * FROM gastos WHERE perfil=? ORDER BY fecha DESC', (perfil,)).fetchall()
        total_mes = conn.execute(
            "SELECT COALESCE(SUM(monto),0) FROM gastos WHERE perfil=? AND strftime('%Y-%m',fecha)=?",
            (perfil, mes_actual_str)).fetchone()[0]
        total_general = conn.execute("SELECT COALESCE(SUM(monto),0) FROM gastos WHERE perfil=?", (perfil,)).fetchone()[0]
        gastos_categoria = conn.execute(
            "SELECT categoria, SUM(monto) as total FROM gastos WHERE perfil=? AND strftime('%Y-%m',fecha)=? GROUP BY categoria ORDER BY total DESC",
            (perfil, mes_actual_str)).fetchall()

        # Presupuesto semanal
        presupuesto = conn.execute(
            "SELECT COALESCE(SUM(monto),0) FROM presupuestos WHERE perfil=? AND semana=?",
            ('personal', semana_key)).fetchone()[0]

        # Gasto de esta semana
        lun = hoy - timedelta(days=hoy.weekday())
        dom = lun + timedelta(days=6)
        gasto_semana = conn.execute(
            "SELECT COALESCE(SUM(monto),0) FROM gastos WHERE perfil=? AND fecha>=? AND fecha<=?",
            ('personal', lun.isoformat(), dom.isoformat())).fetchone()[0]

        # Pagos programados (recurrentes) - TAMBIEN EN PERSONAL
        pagos = conn.execute(
            'SELECT * FROM pagos_programados WHERE perfil=? AND activo=1 ORDER BY dia_vencimiento',
            (perfil,)).fetchall()

        # Calendario del mes
        dias_mes = []
        ultimo = (date(hoy.year, hoy.month + 1, 1) - timedelta(days=1)).day if hoy.month < 12 else 31
        for d in range(1, ultimo + 1):
            fecha_d = date(hoy.year, hoy.month, d)
            pagos_dia = [p for p in pagos if p['dia_vencimiento'] == d]
            gastos_dia = conn.execute(
                "SELECT COUNT(*), COALESCE(SUM(monto),0) FROM gastos WHERE perfil=? AND fecha=?",
                (perfil, fecha_d.isoformat())).fetchone()
            dias_mes.append({
                'dia': d, 'hoy': fecha_d == hoy,
                'pagos': [dict(p) for p in pagos_dia],
                'tiene_gastos': gastos_dia[0] > 0,
                'total_gastos': gastos_dia[1],
            })

        conn.close()
        return render_template('index.html',
            perfiles=PERFILES, perfil_activo=perfil,
            gastos=gastos, ingresos=[], metas=[], deudas=[],
            fecha_legible=fecha_legible,
            total_mes=total_mes, total_general=total_general,
            gastos_categoria=gastos_categoria,
            categorias=CATEGORIAS.get(perfil, {}),
            presupuesto_semanal=presupuesto, gasto_semanal=gasto_semana,
            saldo_semanal=presupuesto - gasto_semana,
            semana_label=f"Semana {semana_actual}",
            pagos=pagos, dias_mes=dias_mes, presupuesto_recibido=0,
            mes_actual=f"{MESES_ES[hoy.month]} {hoy.year}",
            mes_num=hoy.month, anio=hoy.year,
            dias_semana=['Lun','Mar','Mie','Jue','Vie','Sab','Dom'],
            es_resumen=False)

    elif perfil == 'hogar':  # hogar - tiene calendario y pagos
        gastos = conn.execute('SELECT * FROM gastos WHERE perfil=? ORDER BY fecha DESC', (perfil,)).fetchall()
        total_mes = conn.execute(
            "SELECT COALESCE(SUM(monto),0) FROM gastos WHERE perfil=? AND strftime('%Y-%m',fecha)=?",
            (perfil, mes_actual_str)).fetchone()[0]
        total_general = conn.execute("SELECT COALESCE(SUM(monto),0) FROM gastos WHERE perfil=?", (perfil,)).fetchone()[0]
        gastos_categoria = conn.execute(
            "SELECT categoria, SUM(monto) as total FROM gastos WHERE perfil=? AND strftime('%Y-%m',fecha)=? GROUP BY categoria ORDER BY total DESC",
            (perfil, mes_actual_str)).fetchall()

        # Pagos programados (recurrentes) - para ambos perfiles
        pagos = conn.execute(
            'SELECT * FROM pagos_programados WHERE perfil=? AND activo=1 ORDER BY dia_vencimiento',
            (perfil,)).fetchall()

        # Presupuesto recibido (solo hogar) o presupuesto semanal (personal)
        presupuesto = 0
        gasto_semana = 0
        presupuesto_recibido = 0
        if perfil == 'hogar':
            presupuesto_recibido = conn.execute(
                "SELECT COALESCE(SUM(monto),0) FROM presupuestos WHERE perfil=? AND semana=?",
                ('hogar', semana_key)).fetchone()[0]

        # Calendario del mes
        dias_mes = []
        ultimo = (date(hoy.year, hoy.month + 1, 1) - timedelta(days=1)).day if hoy.month < 12 else 31
        for d in range(1, ultimo + 1):
            fecha_d = date(hoy.year, hoy.month, d)
            pagos_dia = [p for p in pagos if p['dia_vencimiento'] == d]
            gastos_dia = conn.execute(
                "SELECT COUNT(*), COALESCE(SUM(monto),0) FROM gastos WHERE perfil=? AND fecha=?",
                (perfil, fecha_d.isoformat())).fetchone()
            dias_mes.append({
                'dia': d,
                'hoy': fecha_d == hoy,
                'pagos': [dict(p) for p in pagos_dia],
                'tiene_gastos': gastos_dia[0] > 0,
                'total_gastos': gastos_dia[1],
            })

        conn.close()
        return render_template('index.html',
            perfiles=PERFILES, perfil_activo=perfil,
            gastos=gastos, ingresos=[], metas=[], deudas=[],
            fecha_legible=fecha_legible,
            total_mes=total_mes, total_general=total_general,
            gastos_categoria=gastos_categoria,
            categorias=CATEGORIAS.get(perfil, {}),
            pagos=pagos, dias_mes=dias_mes,
            presupuesto_recibido=presupuesto_recibido,
            mes_actual=f"{MESES_ES[hoy.month]} {hoy.year}",
            mes_num=hoy.month, anio=hoy.year,
            dias_semana=['Lun','Mar','Mie','Jue','Vie','Sab','Dom'],
            presupuesto_semanal=presupuesto, gasto_semanal=gasto_semana,
            saldo_semanal=presupuesto - gasto_semana if perfil == 'personal' else 0,
            semana_label=f"Semana {semana_actual}" if perfil == 'personal' else '',
            es_resumen=False)

    else:  # resumen
        # Gastos totales
        gasto_total_mes_todos = conn.execute(
            "SELECT COALESCE(SUM(monto),0) FROM gastos WHERE strftime('%Y-%m',fecha)=?",
            (mes_actual_str,)).fetchone()[0]
        gastos_por_perfil = conn.execute(
            "SELECT perfil, COALESCE(SUM(monto),0) as total FROM gastos WHERE strftime('%Y-%m',fecha)=? GROUP BY perfil",
            (mes_actual_str,)).fetchall()

        # Gastos recientes de todos los perfiles
        gastos = conn.execute('SELECT * FROM gastos ORDER BY fecha DESC LIMIT 20').fetchall()

        conn.close()
        return render_template('index.html',
            perfiles=PERFILES, perfil_activo=perfil,
            gastos=gastos, ingresos=ingresos, metas=metas, deudas=deudas,
            fecha_legible=fecha_legible,
            total_ingresos_mes=total_ingresos_mes,
            total_ingresos=total_ingresos,
            total_metas=total_metas, total_ahorrado=total_ahorrado,
            total_deudas=total_deudas, total_pagado=total_pagado,
            gasto_total_mes_todos=gasto_total_mes_todos,
            gastos_por_perfil=gastos_por_perfil,
            mes_actual=f"{MESES_ES[hoy.month]} {hoy.year}",
            categorias={k: v for d in CATEGORIAS.values() for k, v in d.items()},
            es_resumen=True)

# ---- API ----
@app.route('/api/gastos_categoria/<perfil>')
def api_gastos_categoria(perfil):
    conn = get_db()
    hoy = date.today()
    ms = f"{hoy.year}-{hoy.month:02d}"
    data = conn.execute(
        "SELECT categoria, SUM(monto) as total FROM gastos WHERE perfil=? AND strftime('%Y-%m',fecha)=? GROUP BY categoria ORDER BY total DESC",
        (perfil, ms)).fetchall()
    conn.close()
    cats = CATEGORIAS.get(perfil, {})
    return jsonify([{'categoria': r['categoria'], 'total': r['total'], 'color': cats.get(r['categoria'], '#95a5a6')} for r in data])

# ---- Presupuesto semanal ----
@app.route('/set_presupuesto/<perfil>', methods=('POST',))
def set_presupuesto(perfil):
    monto = request.form.get('monto')
    if monto:
        hoy = date.today()
        semana = hoy.isocalendar()[1]
        key = f"{hoy.year}-S{semana:02d}"
        conn = get_db()
        # Reemplazar presupuesto existente de esta semana
        conn.execute('DELETE FROM presupuestos WHERE perfil=? AND semana=?', (perfil, key))
        conn.execute('INSERT INTO presupuestos (perfil, monto, semana) VALUES (?,?,?)', (perfil, float(monto), key))
        conn.commit()
        conn.close()
        flash('Presupuesto actualizado!', 'success')
    return redirect(url_for('index', perfil=perfil))

# ---- Pago programado (recurrente) ----
@app.route('/agregar_pago/<perfil>', methods=('POST',))
def agregar_pago(perfil):
    nombre = request.form.get('nombre')
    monto = request.form.get('monto')
    dia = request.form.get('dia_vencimiento')
    recurrencia = request.form.get('recurrencia', 'Mensual')
    if nombre and monto and dia:
        conn = get_db()
        conn.execute('INSERT INTO pagos_programados (perfil, nombre, monto, dia_vencimiento, recurrencia) VALUES (?,?,?,?,?)',
                     (perfil, nombre, float(monto), int(dia), recurrencia))
        conn.commit()
        conn.close()
        flash('Pago recurrente agregado!', 'success')
    return redirect(url_for('index', perfil=perfil))

@app.route('/eliminar_pago/<perfil>/<int:id>', methods=('POST',))
def eliminar_pago(perfil, id):
    conn = get_db()
    conn.execute('DELETE FROM pagos_programados WHERE id=? AND perfil=?', (id, perfil))
    conn.commit()
    conn.close()
    flash('Pago eliminado!', 'success')
    return redirect(url_for('index', perfil=perfil))

# ---- CRUD Gastos ----
@app.route('/agregar_gasto/<perfil>', methods=('GET', 'POST'))
def agregar_gasto(perfil):
    if perfil not in [p['id'] for p in PERFILES] or perfil == 'resumen':
        flash('Perfil no valido', 'error')
        return redirect(url_for('index'))
    if request.method == 'POST':
        monto = request.form.get('monto')
        descripcion = request.form.get('descripcion')
        categoria = request.form.get('categoria')
        fecha = request.form.get('fecha')
        recurrencia = request.form.get('recurrencia', '')
        comprobante = None
        if 'comprobante' in request.files:
            f = request.files['comprobante']
            if f and f.filename:
                ext = f.filename.rsplit('.', 1)[-1].lower()
                if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                    fn = f"gasto_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
                    f.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))
                    comprobante = fn
        if not monto or not descripcion or not categoria or not fecha:
            flash('Todos los campos son obligatorios.', 'error')
        else:
            conn = get_db()
            conn.execute('INSERT INTO gastos (perfil, monto, descripcion, categoria, fecha, recurrencia, comprobante) VALUES (?,?,?,?,?,?,?)',
                         (perfil, monto, descripcion, categoria, fecha, recurrencia, comprobante))
            conn.commit(); conn.close()
            flash('Gasto agregado!', 'success')
            return redirect(url_for('index', perfil=perfil))
    return render_template('agregar_gasto.html',
        categorias=CATEGORIAS.get(perfil, {}), hoy=date.today().isoformat(),
        perfil=perfil, perfiles=PERFILES, perfil_activo=perfil)

@app.route('/editar_gasto/<perfil>/<int:id>', methods=('GET', 'POST'))
def editar_gasto(perfil, id):
    conn = get_db()
    gasto = conn.execute('SELECT * FROM gastos WHERE id=? AND perfil=?', (id, perfil)).fetchone()
    if not gasto:
        flash('Gasto no encontrado', 'error')
        return redirect(url_for('index', perfil=perfil))
    if request.method == 'POST':
        monto = request.form.get('monto')
        descripcion = request.form.get('descripcion')
        categoria = request.form.get('categoria')
        fecha = request.form.get('fecha')
        recurrencia = request.form.get('recurrencia', '')
        if not monto or not descripcion or not categoria or not fecha:
            flash('Campos obligatorios', 'error')
        else:
            conn.execute('UPDATE gastos SET monto=?, descripcion=?, categoria=?, fecha=?, recurrencia=? WHERE id=? AND perfil=?',
                         (monto, descripcion, categoria, fecha, recurrencia, id, perfil))
            conn.commit(); flash('Gasto actualizado!', 'success')
            return redirect(url_for('index', perfil=perfil))
    conn.close()
    return render_template('editar_gasto.html', gasto=gasto, categorias=CATEGORIAS.get(perfil, {}), perfil=perfil)

@app.route('/eliminar_gasto/<perfil>/<int:id>', methods=('POST',))
def eliminar_gasto(perfil, id):
    conn = get_db()
    conn.execute('DELETE FROM gastos WHERE id=? AND perfil=?', (id, perfil))
    conn.commit(); conn.close()
    flash('Gasto eliminado!', 'success')
    return redirect(url_for('index', perfil=perfil))

# ---- CRUD Ingresos ----
@app.route('/agregar_ingreso', methods=('GET', 'POST'))
def agregar_ingreso():
    if request.method == 'POST':
        m, d, f, r = request.form.get('monto'), request.form.get('descripcion'), request.form.get('fecha'), request.form.get('recurrencia','')
        if not m or not d or not f:
            flash('Campos obligatorios', 'error')
        else:
            conn = get_db()
            conn.execute('INSERT INTO ingresos (monto, descripcion, fecha, recurrencia) VALUES (?,?,?,?)', (m, d, f, r))
            conn.commit(); conn.close()
            flash('Ingreso agregado!', 'success')
            return redirect(url_for('index', perfil='resumen'))
    return render_template('agregar_ingreso.html', hoy=date.today().isoformat())

@app.route('/editar_ingreso/<int:id>', methods=('GET', 'POST'))
def editar_ingreso(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM ingresos WHERE id=?', (id,)).fetchone()
    if request.method == 'POST':
        m, d, f, r = request.form.get('monto'), request.form.get('descripcion'), request.form.get('fecha'), request.form.get('recurrencia','')
        if not m or not d or not f:
            flash('Campos obligatorios', 'error')
        else:
            conn.execute('UPDATE ingresos SET monto=?, descripcion=?, fecha=?, recurrencia=? WHERE id=?', (m, d, f, r, id))
            conn.commit(); conn.close()
            flash('Ingreso actualizado!', 'success')
            return redirect(url_for('index', perfil='resumen'))
    conn.close()
    return render_template('editar_ingreso.html', ingreso=item)

@app.route('/eliminar_ingreso/<int:id>', methods=('POST',))
def eliminar_ingreso(id):
    conn = get_db()
    conn.execute('DELETE FROM ingresos WHERE id=?', (id,))
    conn.commit(); conn.close()
    flash('Ingreso eliminado!', 'success')
    return redirect(url_for('index', perfil='resumen'))

# ---- CRUD Metas ----
@app.route('/agregar_meta', methods=('GET', 'POST'))
def agregar_meta():
    if request.method == 'POST':
        n, mo, fl = request.form.get('nombre'), request.form.get('monto_objetivo'), request.form.get('fecha_limite')
        if not n or not mo or not fl:
            flash('Campos obligatorios', 'error')
        else:
            conn = get_db()
            conn.execute('INSERT INTO metas_ahorro (nombre, monto_objetivo, fecha_limite) VALUES (?,?,?)', (n, mo, fl))
            conn.commit(); conn.close()
            flash('Meta agregada!', 'success')
            return redirect(url_for('index', perfil='resumen'))
    return render_template('agregar_meta.html', hoy=date.today().isoformat())

@app.route('/editar_meta/<int:id>', methods=('GET', 'POST'))
def editar_meta(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM metas_ahorro WHERE id=?', (id,)).fetchone()
    if request.method == 'POST':
        n, mo, ma, fl = request.form.get('nombre'), request.form.get('monto_objetivo'), request.form.get('monto_actual'), request.form.get('fecha_limite')
        if not n or not mo or not fl:
            flash('Campos obligatorios', 'error')
        else:
            conn.execute('UPDATE metas_ahorro SET nombre=?, monto_objetivo=?, monto_actual=?, fecha_limite=? WHERE id=?', (n, mo, ma, fl, id))
            conn.commit(); conn.close()
            flash('Meta actualizada!', 'success')
            return redirect(url_for('index', perfil='resumen'))
    conn.close()
    return render_template('editar_meta.html', meta=item)

@app.route('/eliminar_meta/<int:id>', methods=('POST',))
def eliminar_meta(id):
    conn = get_db()
    conn.execute('DELETE FROM metas_ahorro WHERE id=?', (id,))
    conn.commit(); conn.close()
    flash('Meta eliminada!', 'success')
    return redirect(url_for('index', perfil='resumen'))

# ---- CRUD Deudas ----
@app.route('/agregar_deuda', methods=('GET', 'POST'))
def agregar_deuda():
    if request.method == 'POST':
        n, mt, fi, ffe = request.form.get('nombre'), request.form.get('monto_total'), request.form.get('fecha_inicio'), request.form.get('fecha_fin_estimada','')
        if not n or not mt or not fi:
            flash('Campos obligatorios', 'error')
        else:
            conn = get_db()
            conn.execute('INSERT INTO deudas (nombre, monto_total, fecha_inicio, fecha_fin_estimada) VALUES (?,?,?,?)', (n, mt, fi, ffe))
            conn.commit(); conn.close()
            flash('Deuda agregada!', 'success')
            return redirect(url_for('index', perfil='resumen'))
    return render_template('agregar_deuda.html', hoy=date.today().isoformat())

@app.route('/editar_deuda/<int:id>', methods=('GET', 'POST'))
def editar_deuda(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM deudas WHERE id=?', (id,)).fetchone()
    if request.method == 'POST':
        n, mt, mp, fi, ffe = request.form.get('nombre'), request.form.get('monto_total'), request.form.get('monto_pagado'), request.form.get('fecha_inicio'), request.form.get('fecha_fin_estimada','')
        if not n or not mt or not fi:
            flash('Campos obligatorios', 'error')
        else:
            conn.execute('UPDATE deudas SET nombre=?, monto_total=?, monto_pagado=?, fecha_inicio=?, fecha_fin_estimada=? WHERE id=?', (n, mt, mp, fi, ffe, id))
            conn.commit(); conn.close()
            flash('Deuda actualizada!', 'success')
            return redirect(url_for('index', perfil='resumen'))
    conn.close()
    return render_template('editar_deuda.html', deuda=item)

@app.route('/eliminar_deuda/<int:id>', methods=('POST',))
def eliminar_deuda(id):
    conn = get_db()
    conn.execute('DELETE FROM deudas WHERE id=?', (id,))
    conn.commit(); conn.close()
    flash('Deuda eliminada!', 'success')
    return redirect(url_for('index', perfil='resumen'))

# ---- Exportar ----
@app.route('/exportar/<perfil>')
def exportar(perfil):
    conn = get_db()
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(['Tipo','Monto','Descripcion','Categoria','Fecha','Recurrencia'])
    if perfil == 'resumen':
        for r in conn.execute("SELECT 'Gasto' as t, monto, descripcion, categoria, fecha, recurrencia FROM gastos").fetchall():
            w.writerow([r['t'], r['monto'], r['descripcion'], r['categoria'], r['fecha'], r['recurrencia']])
        for r in conn.execute("SELECT 'Ingreso' as t, monto, descripcion, '', fecha, recurrencia FROM ingresos").fetchall():
            w.writerow([r['t'], r['monto'], r['descripcion'], '', r['fecha'], r['recurrencia']])
    else:
        for r in conn.execute("SELECT 'Gasto' as t, monto, descripcion, categoria, fecha, recurrencia FROM gastos WHERE perfil=?", (perfil,)).fetchall():
            w.writerow([r['t'], r['monto'], r['descripcion'], r['categoria'], r['fecha'], r['recurrencia']])
    conn.close()
    mem = io.BytesIO(out.getvalue().encode('utf-8'))
    mem.seek(0)
    return send_file(mem, mimetype='text/csv', as_attachment=True, download_name=f'finanzas_{perfil}_{date.today().isoformat()}.csv')

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
