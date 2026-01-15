import { RequestData } from "@/types";

export type CodeLanguage = 'curl' | 'javascript' | 'nodejs' | 'python' | 'go';

export const SUPPORTED_LANGUAGES: { id: CodeLanguage; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'javascript', label: 'JavaScript (Fetch)' },
    { id: 'nodejs', label: 'Node.js (Axios)' },
    { id: 'python', label: 'Python (Requests)' },
    { id: 'go', label: 'Go (Native)' },
];

export function generateCode(request: RequestData, language: CodeLanguage): string {
    const url = request.url || 'http://localhost';
    const method = request.method || 'GET';
    const headers = (request.headers || []).filter(h => h.active && h.key);

    // Fallback for body handling
    const bodyData = request.body && typeof request.body !== 'string' ? request.body : undefined;

    switch (language) {
        case 'curl':
            return generateCurl(method, url, headers, bodyData);
        case 'javascript':
            return generateJsFetch(method, url, headers, bodyData);
        case 'nodejs':
            return generateNodeAxios(method, url, headers, bodyData);
        case 'python':
            return generatePythonRequests(method, url, headers, bodyData);
        case 'go':
            return generateGo(method, url, headers, bodyData);
        default:
            return '// Language not supported';
    }
}

function generateCurl(method: string, url: string, headers: any[], bodyData: any): string {
    let code = `curl -X ${method} "${url}"`;

    headers.forEach(h => {
        code += ` \\\n  -H "${h.key}: ${h.value}"`;
    });

    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyData) {
        if (bodyData.type === 'json' && bodyData.json) {
            code += ` \\\n  -H "Content-Type: application/json"`;
            // Escape single quotes for shell
            const cleanJson = bodyData.json.replace(/'/g, "'\\''");
            code += ` \\\n  -d '${cleanJson}'`;
        } else if (bodyData.type === 'raw' && bodyData.raw) {
            code += ` \\\n  -d '${bodyData.raw}'`;
        }
    }

    return code;
}

function generateJsFetch(method: string, url: string, headers: any[], bodyData: any): string {
    let options: string[] = [`method: "${method}"`];

    // Headers object
    if (headers.length > 0 || (bodyData?.type === 'json')) {
        let headerLines = headers.map(h => `    "${h.key}": "${h.value}"`);
        if (bodyData?.type === 'json') {
            headerLines.push(`    "Content-Type": "application/json"`);
        }
        options.push(`headers: {\n${headerLines.join(',\n')}\n  }`);
    }

    // Body
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyData) {
        if (bodyData.type === 'json' && bodyData.json) {
            options.push(`body: JSON.stringify(${bodyData.json})`);
        } else if (bodyData.type === 'raw' && bodyData.raw) {
            options.push(`body: ${JSON.stringify(bodyData.raw)}`);
        }
    }

    return `fetch("${url}", {
  ${options.join(',\n  ')}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`;
}

function generateNodeAxios(method: string, url: string, headers: any[], bodyData: any): string {
    return `const axios = require('axios');

let config = {
  method: '${method.toLowerCase()}',
  maxBodyLength: Infinity,
  url: '${url}',
  headers: { 
${headers.map(h => `    '${h.key}': '${h.value}'`).join(',\n')}${bodyData?.type === 'json' && headers.length ? ',\n' : ''}${bodyData?.type === 'json' ? "    'Content-Type': 'application/json'" : ''}
  }${['POST', 'PUT', 'PATCH'].includes(method) && bodyData?.json ? `,
  data: ${bodyData.json}` : ''}
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});`;
}

function generatePythonRequests(method: string, url: string, headers: any[], bodyData: any): string {
    let code = `import requests\nimport json\n\nurl = "${url}"\n\n`;

    // Headers
    if (bodyData?.type === 'json') headers.push({ key: 'Content-Type', value: 'application/json' });

    if (headers.length > 0) {
        code += `payload = {}\nheaders = {\n`;
        code += headers.map(h => `  '${h.key}': '${h.value}'`).join(',\n');
        code += `\n}\n\n`;
    }

    // Body
    let dataArg = '';
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyData) {
        if (bodyData.type === 'json' && bodyData.json) {
            code += `payload = json.dumps(${bodyData.json})\n\n`;
            dataArg = `, data=payload`;
        } else if (bodyData.type === 'raw') {
            code += `payload = """${bodyData.raw}"""\n\n`;
            dataArg = `, data=payload`;
        }
    }

    code += `response = requests.request("${method}", url, headers=headers${dataArg})\n\n`;
    code += `print(response.text)`;

    return code;
}

function generateGo(method: string, url: string, headers: any[], bodyData: any): string {
    return `package main

import (
  "fmt"
  "strings"
  "net/http"
  "io/ioutil"
)

func main() {

  url := "${url}"
  method := "${method}"

  ${bodyData?.json && ['POST', 'PUT', 'PATCH'].includes(method)
            ? `payload := strings.NewReader(\`${bodyData.json}\`)\n\n  client := &http.Client {}\n  req, err := http.NewRequest(method, url, payload)`
            : `client := &http.Client {}\n  req, err := http.NewRequest(method, url, nil)`
        }

  if err != nil {
    fmt.Println(err)
    return
  }
  ${headers.map(h => `req.Header.Add("${h.key}", "${h.value}")`).join('\n  ')}
  ${bodyData?.type === 'json' ? `req.Header.Add("Content-Type", "application/json")` : ''}

  res, err := client.Do(req)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer res.Body.Close()

  body, err := ioutil.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return
  }
  fmt.Println(string(body))
}`;
}
