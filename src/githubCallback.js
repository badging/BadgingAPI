const handleGithubCallback = async (req, res, octokit) => {
  const userRepos = await octokit.repos.listForAuthenticatedUser();
  const repositories = userRepos.data;

  res.send(`
    <h1>Select Repositories</h1>
      <form action="/api/repo" method="POST">
        <select id="repository-select">
          ${repositories
            .map(
              (repo) =>
                `<option value="${repo.full_name}">${repo.full_name}</option>`
            )
            .join("")}
        </select>
        <button type="button" onclick="addRepository()">Add Repository</button>
        <input type="hidden" name="repositories" id="selected-repositories" value="[]">
        <ul id="selected-repositories-list"></ul>
        <button type="submit">Submit</button>
      </form>

      <script>
        const repositorySelect = document.getElementById('repository-select');
        const selectedRepositories = [];

        function addRepository() {
          const selectedOption = repositorySelect.options[repositorySelect.selectedIndex];
          const repositoryName = selectedOption.value;
          const repositoryFullName = selectedOption.text;

          if (!selectedRepositories.includes(repositoryName)) {
            selectedRepositories.push(repositoryName);

            const selectedRepositoriesList = document.getElementById('selected-repositories-list');
            const li = document.createElement('li');
            li.textContent = repositoryFullName;
            selectedRepositoriesList.appendChild(li);
          }
        }

        document.getElementById('repository-select').addEventListener('change', () => {
          addRepository();
        });

        document.getElementById('selected-repositories-list').addEventListener('click', (event) => {
          const repositoryName = event.target.textContent;
          const index = selectedRepositories.indexOf(repositoryName);
          if (index > -1) {
            selectedRepositories.splice(index, 1);
            event.target.remove();
          }
        });

        document.getElementById('repository-select').addEventListener('change', () => {
          document.getElementById('selected-repositories').value = JSON.stringify(selectedRepositories);
        });
      </script>
    `);
};

module.exports = handleGithubCallback;
