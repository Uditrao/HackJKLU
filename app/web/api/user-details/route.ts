import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'users.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                name: "", age: "", area: "", id: "", createdAt: "", updatedAt: ""
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching user data:", error);
        return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userData = await request.json();

        const dataDir = path.join(process.cwd(), 'data');
        const filePath = path.join(dataDir, 'users.json');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        let existingData: any = {};
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                existingData = JSON.parse(fileContent);
            } catch (e) {
                existingData = {};
            }
        }

        // Handle both object and array cases (for backward compatibility if needed, but we want object)
        if (Array.isArray(existingData)) {
            existingData = existingData[0] || {};
        }

        const now = new Date().toISOString();
        const updatedUser = {
            ...userData,
            id: existingData.id || Date.now().toString(),
            createdAt: existingData.createdAt || now,
            updatedAt: now
        };

        // Write as a single object, not an array
        fs.writeFileSync(filePath, JSON.stringify(updatedUser, null, 2));

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Error saving user data:", error);
        return NextResponse.json({ success: false, error: "Failed to save user data" }, { status: 500 });
    }
}
