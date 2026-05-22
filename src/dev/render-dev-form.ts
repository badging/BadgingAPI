  /**
   * DEV HTML RENDERER
   */

  export function renderDevRepoForm(
    data: {
      userId: number;
      name: string;
      username: string;
      email: string;
      repos: Array<{ id: number; fullName: string }>;
    },
    provider: string
  ): string {
    return `
<html>
<head>
  <title>Select Repositories</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1, h2, h3 { margin: 5px 0; }
    .repo { margin: 5px 0; }
    button { margin-top: 10px; padding: 8px 12px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Welcome ${data.name}</h1>
  <h3>Username: ${data.username}</h3>
  <h3>Email: ${data.email}</h3>

  <form id="reposForm">
    <input type="hidden" name="provider" value="${provider}">
    <input type="hidden" name="userId" value="${data.userId}">

    <h2>Select Repositories:</h2>
    ${data.repos
      .map(
        (repo) => `
      <div class="repo">
        <input type="checkbox" name="repos[]" value="${repo.id}" id="repo-${repo.id}">
        <label for="repo-${repo.id}">${repo.fullName}</label>
      </div>
    `
      )
      .join('')}

    <button type="submit">Scan Projects</button>
  </form>

  <script>
    const form = document.getElementById('reposForm');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);

      const payload = {
        provider: formData.get('provider'),
        userId: Number(formData.get('userId')),
        repos: formData.getAll('repos[]').map(id => ({ id: Number(id) }))
      };

      try {
        const res = await fetch('/api/repos-to-badge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const text = await res.text();

          alert('Error: ' + text);

          return;
        }

        const json = await res.json();

        const params = new URLSearchParams({
          provider: payload.provider,
          userId: payload.userId,
          name: '${data.name}',
          email: '${data.email}'
        }).toString();

        window.location.href =
          '/api/project-badging-successful?' + params;

      } catch (err) {
        alert('Network error: ' + err);
      }
    });
  </script>
</body>
</html>
    `;
  }