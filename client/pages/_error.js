    import { useRouter } from "next/router";

export default function Error({ statusCode, err }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold text-red-600 mb-4">
          {statusCode || "⚠️"}
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {statusCode ? `Error ${statusCode}` : "Something went wrong"}
        </h1>
        <p className="text-gray-600 mb-6">
          {statusCode === 404
            ? "The page you're looking for doesn't exist."
            : statusCode === 500
            ? "An internal server error occurred."
            : "An unexpected error has occurred. Please try refreshing the page or going back."}
        </p>

        {err && process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded text-left text-sm text-red-700 overflow-auto max-h-32">
            <p className="font-mono text-xs whitespace-pre-wrap">{err.message || err.toString()}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Home
          </button>
          <button
            onClick={() => router.reload()}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err, asPath }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  console.error(`Error on path ${asPath}:`, err);
  return { statusCode, err };
};
