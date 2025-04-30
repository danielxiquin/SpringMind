export default function Hero() {
    return (
      <section className="relative min-h-screen w-full flex flex-col justify-between text-white"
        style={{
          background: "#242021"
        }}
      >
        <div className="container mx-auto flex justify-center items-center flex-grow">
          <div className="text-center">
            <h1 className="text-[16em] text-[#f1f1f1] font-normal leading-[0.9] font-['Anton']">
              SPRINGMIND
            </h1>                       
          </div>
        </div>
        
        <div className="container mx-auto text-center pb-8">
          <h3 className="text-[#9b702c] text-2xl font-normal  leading-[1.1] font-['Libre-Bodoni']">
              Resolviendo Sistemas Complejos <br />
          </h3>
        </div>
      </section>
    )
  }