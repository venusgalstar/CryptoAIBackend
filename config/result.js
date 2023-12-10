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

        .critical{
            color: red;
        }

        .major{
            color: brown;
        }

        .medium{
            color: orange;
        }

        .minor{
            color: rgb(104, 104, 1);
        }

        .informational{
            color: green;
        }
    </style>
</head>
<body>

    <header>
        <h1>Audit Report %s</h1>
        <p>Prepared on: %s</p>
    </header>

    <section>
        <h2>Overall Rating</h2>
        <table>
            <thead>
                <tr>
                    <th class='critical'>Critical</th>
                    <th class='major'>Major</th>
                    <th class='medium'>Medium</th>
                    <th class='minor'>Minor</th>
                    <th class='informational'>Informational</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>%s</td>
                    <td>%s</td>
                    <td>%s</td>
                    <td>%s</td>
                    <td>%s</td>
                </tr>
            </tbody>
        </table>
    </section>

    <section>
        <h2>Overall View</h2>
        <p>
            %s
        </p>
    </section>

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
<script>
    const screenWidth = window.innerWidth * 2 / 3;

    console.log('screenWidth',screenWidth);

    function scaleSvg(svg, scaleX) {
        
        const currentWidth = parseFloat(svg.getAttribute('width'));
        const currentHeight = parseFloat(svg.getAttribute('height'));

        if( currentWidth < scaleX )
            return;
        
        const newWidth = scaleX;
        const newHeight = currentHeight * scaleX / currentWidth;

        svg.setAttribute('width', newWidth+'pt');
        svg.setAttribute('height', newHeight+'pt');
    }


    const svgElements = document.getElementsByTagName('svg');

    for (let i = 0; i < svgElements.length; i++) {
        var svgElement = svgElements[i];

        scaleSvg(svgElement, screenWidth);
    }
</script>
</html>`;

const auditResult1 = `<html>%s, %s, %s</html>`;

module.exports = {
    auditResult,
    auditResult1
};
