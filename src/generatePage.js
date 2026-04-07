import fs from "fs";

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>My Node Page</title>
</head>
<body>
  <h1>Welcome to my Node.js page</h1>
  <p>This page was generated using Node.js.</p>
</body>
</html>
`;

fs.writeFileSync("docs/index.html", html);
console.log("Generated docs/index.html");