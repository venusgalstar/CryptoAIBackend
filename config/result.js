const auditResult = `<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Audit Report</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 20px;
        }
        header {
            text-align: center;
            margin-bottom: 20px;
        }
        h1 {
            text-align: center;
            color: #333;
        }
        h2 {
            text-align: center;
        }
        section {
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }
        th {
            text-align: center;
            background-color: #f2f2f2;
        }
        footer {
            text-align: center;
            margin-top: 30px;
            color: #777;
        }
    </style>
</head>
<body>

    <header>
        <h1>Audit Report</h1>
        <p>Prepared on: %s</p>
    </header>

    <section>
        <h2>Summary of Findings</h2>
        <p>
            %s
        </p>
    </section>

    <section>
        <h2>Configuration Audit</h2>
        <table>
            <thead>
                <tr>
                    <th>Audit Result Images</th>
                </tr>
            </thead>
            <tbody>
                %s
            </tbody>
        </table>
    </section>

    <section>
        <h2>Human Summary of Audit</h2>
        <p>
            %s
        </p>
    </section>
    <section>
        <h2>Contract Summary of Audit</h2>
        <p>
            %s
        </p>
    </section>
    <section>
        <h2>Function Summary of Audit</h2>
        <p>
            %s
        </p>
    </section>
    <footer>
        <p>&copy; 2023 Audit Corporation. All rights reserved.</p>
    </footer>

</body>
</html>`;

const auditResult1 = `<html>%s, %s, %s</html>`;

module.exports = {
    auditResult, 
    auditResult1
};
