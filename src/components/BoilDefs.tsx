export function BoilDefs() {
  return (
    <svg className="boil-defs" width="0" height="0" aria-hidden="true">
      <defs>
        {/* Stronger boil for the big flying pig */}
        <filter id="pig-boil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves="2"
            seed="1"
            result="noise"
          >
            <animate
              attributeName="seed"
              values="1;2;3;4;5;6;7;8"
              dur="0.55s"
              repeatCount="indefinite"
              calcMode="discrete"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Subtler boil for the small hero mascot — same idea, tamer */}
        <filter id="pig-boil-subtle" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="2"
            seed="1"
            result="noise"
          >
            <animate
              attributeName="seed"
              values="1;2;3;4;5;6"
              dur="0.5s"
              repeatCount="indefinite"
              calcMode="discrete"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
