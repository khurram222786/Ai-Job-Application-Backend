# AI Job Application Backend

## Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Ai-Job-Application-Backend.git
   cd Ai-Job-Application-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create the `uploads` folder in the project root**
   ```bash
   mkdir uploads
   ```

4. **Configure your database and environment variables**
   - Edit `src/config/config.json` with your database settings.
   - Set any required environment variables (e.g., `GEMINI_API_KEY`).

5. **Run database migrations and seeders**
   ```bash
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

6. **Start the server**
   ```bash
   npm start
   ``` 