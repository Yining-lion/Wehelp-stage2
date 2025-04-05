import {renderHeader, userAuthEvents, checkSignInStatus} from "./header.js"

const $ = (selector) => document.querySelector(selector);

renderHeader();
userAuthEvents();
checkSignInStatus();