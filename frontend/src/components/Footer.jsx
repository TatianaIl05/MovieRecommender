import React from 'react'

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__section">
          <h3 className="footer__title">Movie Recommender</h3>
          <p className="footer__text">Curated cinema discovery for every mood.</p>
        </div>
        <div className="footer__section">
          <h4 className="footer__subtitle">Contact</h4>
          <a href="mailto:astvacp@gmail.com" className="footer__link">astvacp@gmail.com</a>
        </div>
        <div className="footer__section">
          <h4 className="footer__subtitle">Source</h4>
          <a href="https://github.com/TatianaIl05/MovieRecommender" target="_blank" rel="noopener noreferrer" className="footer__link">GitHub</a>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p> Movie Recommender. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer