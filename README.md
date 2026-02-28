# Ephemeral File Server (TypeScript + Effect)

A highly optimized Node.js service created to securely store and serve images exactly once. Built strictly with the functional programming ecosystem [Effect](https://effect.website/) for robust type-safety and error-handling without relying on any `any` types.

Required Node.js version is **v22.x** and relies on Yarn for package management.

## Features

- **Store an image:** Accepts a POST request with `multipart/form-data` and saves it strictly to local temporary storage.
- **View exactly once:** Fetches an image via a GET endpoint, strictly verifies existence, returns the payload to the requester, and synchronously unlinks it from disk.
- **Strict Typing:** Completely built relying on `@effect/platform` types without `any` bypasses.

## Setup Instructions

1. **Clone the repository**

2. **Set up `.env` file**
   Copy the provided `.env.example` block to `.env` representing your environment variables:

   ```env
   PORT=3000
   HOST=0.0.0.0
   BASE_URL=http://localhost:3000
   UPLOAD_DIR=/tmp/ephemeral-uploads
   ```

3. **Install Dependencies**
   ```bash
   yarn install
   ```

## Running Locally

To start a local hot-reload development server:

```bash
yarn dev
```

To run a production build:

```bash
yarn build
yarn start
```

## Docker Deployment

This repository includes a multi-staged minimal `Dockerfile` constructed using standard Alpine node bases.

```bash
# Build the extremely lightweight image
docker build -t ephemeral-file-server .

# Run the container locally mapping port 3000
docker run -p 3000:3000 -d ephemeral-file-server
```

## API Usage

### `POST /upload`

To upload multiple images, the form field part must be exactly named `image`.

```bash
curl -X POST -F "image=@/path/to/my-picture.png" http://localhost:3000/upload
```

**Response:**

```json
{
  "url": "http://localhost:3000/image/d3b07384-d113-4c91-b3b3-1f14800e84b1"
}
```

### `GET /image/:id`

The endpoint retrieves the provided ID, infers its Mime/content type precisely through extension, returns the buffer stream to front-facing agents, and completely unlinks/wipes the local file storage payload dynamically to emulate ephemeral lifecycles.

```bash
curl -i http://localhost:3000/image/d3b07384-d113-4c91-b3b3-1f14800e84b1
```

If you request the same object again:

```http
HTTP/1.1 404 Not Found
```
