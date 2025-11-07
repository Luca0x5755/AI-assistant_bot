/**
 * Simple test component to verify frontend is working
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const TestComponent = () => {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <Card className="max-w-md mx-auto p-6 bg-gray-900 border-gray-700">
        <h1 className="text-2xl font-bold mb-4 text-center">
          AVATAR Frontend Test
        </h1>

        <div className="space-y-4">
          <p className="text-gray-300">
            If you can see this, the frontend is working!
          </p>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => alert('Frontend is working!')}
          >
            Test Button
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 bg-blue-500 rounded"></div>
            <div className="h-8 bg-pink-500 rounded"></div>
            <div className="h-8 bg-yellow-500 rounded"></div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Status: Frontend loaded successfully ✅
          </p>
        </div>
      </Card>
    </div>
  );
};