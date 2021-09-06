export default async function runRequest(projectName, body) {
    console.log("Inside runRequest ", projectName, body);
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({"body": body, "projectName": projectName})
    });
    return response.json();
  }