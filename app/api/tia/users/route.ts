import connectDB from "../../../server/tia/mongoose";
import User from "../../../server/tia/models/User";

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}).limit(100).lean();
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("/api/tia/users error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "failed to fetch users", details: msg }), { status: 500 });
  }
}
