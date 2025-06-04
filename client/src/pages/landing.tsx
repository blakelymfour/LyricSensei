import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-700 flex flex-col justify-center items-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 400 800" fill="none">
          <circle cx="100" cy="200" r="80" fill="white"/>
          <circle cx="300" cy="400" r="60" fill="white"/>
          <circle cx="150" cy="600" r="40" fill="white"/>
        </svg>
      </div>
      <div className="relative z-10 w-full max-w-sm">
        {/* App Logo and Branding */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fas fa-music text-3xl text-purple-500"></i>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Lyric Sensei</h1>
          <p className="text-white/80 text-sm">AI-powered lyrics analysis</p>
        </div>

        {/* Welcome Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/30">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">Welcome</h2>
            <p className="text-white/80 text-center mb-6 font-medium pl-[0px] pr-[0px] pt-[0px] pb-[0px]">Discover the deeper meaning of your favorite music.</p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-white text-purple-500 hover:bg-gray-100 font-semibold py-3"
                size="lg"
              >
                Continue with Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="text-center mt-8 text-white/80 text-sm">
          <p>✨ AI-powered lyrics analysis</p>
          <p>📚 Personal history tracking</p>
          <p>❤️ Save your favorite analyses</p>
        </div>
      </div>
    </div>
  );
}
