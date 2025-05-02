export default function Menu() {
    return (
      <nav className="absolute top-0 left-0 right-0 z-50 p-5">
        <div className="container mx-auto flex justify-between items-center">
          <a href="/" className="text-[#9b702c] text-2xl max-md:text-xl font-semibold font-['Poppins']">SPRINGMIND</a>
          <div className="space-x-4">
            <a href="#" className="text-[#9b702c] text-2xl max-md:text-xl hover:text-gray-500 font-['Poppins']">GITHUB</a>
          </div>
        </div>
      </nav>
    );
  }