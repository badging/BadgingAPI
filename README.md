# Project Badging Backend

Server side development of the DEI Project Badging focusing on scripting, databases, back-end logic, &amp; APIs

## Contribute

### Required dependencies

To Badging API requires NodeJS (18 or higher) and Docker installed locally.

N.B.: Docker Desktop isn't explicitly required, an alternative like Rancher Desktop works as well.

### Running locally

Once the [required dependencies](#required-dependencies) are available in your system you can spin up the development environment.

1. Run `docker compose up -d` to start the database service
   - You can omit the `-d` to not start the container in the background
2. Run `npm install` to install the additional dependencies
3. Run `npm run dev`

This will start the Badging API service which will be available on port `8000`.

The port can be configured inside `.env.development`, as well as other configuration settings for the database.

### Stopping the development environment

To stop the Badging API service issuing `Ctrl + C` on the terminal running it.

To stop the database container you can run `docker compose down`.

### Troubleshooting

If the command `docker compose up -d` returns an error, make sure the `/tmp/mysql` folder exists. If it doesn't exist, create it.
