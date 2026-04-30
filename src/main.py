
from flask import Flask, render_template_string, redirect, url_for

app = Flask(__name__)

@app.route('/')
def serve_root():
    return "Welcome to the root!"

@app.route('/academy')
def serve_academy():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Academy</title>
    </head>
    <body>
        <h1>Academy</h1>
        <ul>

            <li><a href="{{ url_for('serve_course_preview', course_name='introducao-a-programacao') }}" class="edu-btn-outline">ACESSAR CURSO</a></li>
        </ul>
    </body>
    </html>
    """
    





    return render_template_string(html_content)
@app.route('/coursepreview-<path:course_name>.html')
def serve_course_preview(course_name):
        preview_html = file.read()
    
    return render_template_string(preview_html)

if __name__ == '__main__':
    app.run(debug=True)
    with open(f'coursepreview-{course_name}.html', 'r') as file: