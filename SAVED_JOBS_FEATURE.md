# Saved Jobs Feature Implementation

## Overview
The saved jobs feature allows users to bookmark/save jobs they're interested in for later reference. This feature includes full CRUD operations with proper authentication and authorization.

## Database Schema

### SavedJobs Table
```sql
CREATE TABLE "SavedJobs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "Users"("user_id") ON DELETE CASCADE,
  "job_id" INTEGER NOT NULL REFERENCES "Jobs"("id") ON DELETE CASCADE,
  "saved_at" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

-- Unique constraint to prevent duplicate saved jobs
CREATE UNIQUE INDEX "saved_jobs_user_job_unique" ON "SavedJobs" ("user_id", "job_id");
```

## API Endpoints

### 1. Save a Job
**POST** `/api/jobs/:jobId/save`
- **Authentication**: Required (JWT token)
- **Authorization**: User role only
- **Parameters**: 
  - `jobId` (path parameter): ID of the job to save
- **Response**:
```json
{
  "success": true,
  "message": "Job saved successfully",
  "data": {
    "savedJob": {
      "id": 1,
      "job_id": 123,
      "user_id": 456,
      "saved_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 2. Unsave a Job
**DELETE** `/api/jobs/:jobId/save`
- **Authentication**: Required (JWT token)
- **Authorization**: User role only
- **Parameters**:
  - `jobId` (path parameter): ID of the job to unsave
- **Response**:
```json
{
  "success": true,
  "message": "Job unsaved successfully",
  "data": null
}
```

### 3. Get Saved Jobs
**GET** `/api/saved-jobs?page=1&limit=10`
- **Authentication**: Required (JWT token)
- **Authorization**: User role only
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10, max: 100)
- **Response**:
```json
{
  "success": true,
  "message": "Saved jobs retrieved successfully",
  "data": {
    "currentPage": 1,
    "totalPages": 5,
    "totalSavedJobs": 50,
    "savedJobs": [
      {
        "saved_at": "2024-01-15T10:30:00.000Z",
        "job": {
          "id": 123,
          "title": "Software Engineer",
          "description": "We are looking for...",
          "requirements": "5+ years experience...",
          "location": "New York",
          "salary": "$80,000 - $120,000",
          "skills": ["JavaScript", "React", "Node.js"],
          "job_type": "remote",
          "employment_type": "full-time",
          "working_hours": "40 hours/week",
          "responsibilities": "Develop and maintain...",
          "created_at": "2024-01-10T09:00:00.000Z",
          "employer": {
            "username": "techcompany",
            "email": "hr@techcompany.com"
          }
        }
      }
    ]
  }
}
```

### 4. Check if Job is Saved
**GET** `/api/jobs/:jobId/saved`
- **Authentication**: Required (JWT token)
- **Authorization**: User role only
- **Parameters**:
  - `jobId` (path parameter): ID of the job to check
- **Response**:
```json
{
  "success": true,
  "message": "Job saved status checked successfully",
  "data": {
    "job_id": 123,
    "is_saved": true
  }
}
```

### 5. Get Saved Job IDs
**GET** `/api/saved-job-ids`
- **Authentication**: Required (JWT token)
- **Authorization**: User role only
- **Response**:
```json
{
  "success": true,
  "message": "Saved job IDs retrieved successfully",
  "data": {
    "saved_job_ids": [123, 456, 789]
  }
}
```

## Error Responses

### Job Not Found (404)
```json
{
  "success": false,
  "message": "Job not found"
}
```

### Job Already Saved (400)
```json
{
  "success": false,
  "message": "Job is already saved"
}
```

### Job Not Saved (404)
```json
{
  "success": false,
  "message": "Job is not saved"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Job ID must be a positive integer"
}
```

## Implementation Details

### Files Created/Modified:

1. **Models**:
   - `src/models/savedJob.js` - New SavedJob model
   - `src/models/user.js` - Added SavedJob association
   - `src/models/job.js` - Added SavedJob association

2. **Database**:
   - `src/migrations/20250618113727-create-saved-jobs.js` - Migration file

3. **Repository**:
   - `src/repositories/savedJobRepository.js` - Database operations

4. **Controller**:
   - `src/controllers/savedJobController.js` - Business logic

5. **Routes**:
   - `src/routes/savedJobRoutes.js` - API endpoints
   - `src/config/routes.js` - Registered new routes

6. **Validation**:
   - `src/validators/savedJobValidator.js` - Input validation

### Key Features:

1. **Unique Constraint**: Prevents users from saving the same job multiple times
2. **Cascade Delete**: When a job or user is deleted, saved jobs are automatically removed
3. **Pagination**: Supports pagination for retrieving saved jobs
4. **Validation**: Comprehensive input validation using Joi
5. **Authentication**: All endpoints require valid JWT authentication
6. **Authorization**: Only users (not admins) can save jobs
7. **Error Handling**: Proper error responses with meaningful messages

## Usage Examples

### Frontend Integration

```javascript
// Save a job
const saveJob = async (jobId) => {
  const response = await fetch(`/api/jobs/${jobId}/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Get saved jobs
const getSavedJobs = async (page = 1, limit = 10) => {
  const response = await fetch(`/api/saved-jobs?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Check if job is saved
const checkIfSaved = async (jobId) => {
  const response = await fetch(`/api/jobs/${jobId}/saved`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

## Testing

To test the feature:

1. **Run the migration**:
   ```bash
   npx sequelize-cli db:migrate
   ```

2. **Start the server**:
   ```bash
   npm run dev
   ```

3. **Test endpoints** using Postman or curl with proper authentication headers.

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Only users can save jobs (admins cannot)
3. **Input Validation**: All inputs are validated using Joi
4. **SQL Injection Protection**: Using Sequelize ORM with parameterized queries
5. **Rate Limiting**: Consider implementing rate limiting for production

## Future Enhancements

1. **Bulk Operations**: Save/unsave multiple jobs at once
2. **Categories**: Organize saved jobs into categories
3. **Notes**: Allow users to add personal notes to saved jobs
4. **Notifications**: Notify users when saved jobs are updated
5. **Export**: Export saved jobs to PDF/CSV
6. **Sharing**: Share saved jobs with other users 