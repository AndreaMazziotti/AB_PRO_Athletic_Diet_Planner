
import React from 'react';

const LOGO_SRC = '/AB_Nutrition_logo.png';

interface SplashScreenProps {
  exiting: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ exiting }) => {
  return (
    <div
      className={`splash-screen ${exiting ? 'splash-screen--out' : ''}`}
      role="img"
      aria-label="AB Nutrition"
    >
      <div className="splash-screen__vignette" />
      <div className="splash-screen__content">
        <div className="splash-screen__logo-wrap">
          <img
            src={LOGO_SRC}
            alt=""
            className="splash-screen__logo"
            width={420}
            height={120}
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
