
// Checks if users are authenticated and sends a status code if not
function isAuthenticated (req, res, next) {
    if(!req.session.user) return res.status(401).send();
    else return next();
}
// Checks if users are authenticated and redirects them if not
function pageAuthenticationProtection (req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    else return next();
}

module.exports = {
    isAuthenticated,
    pageAuthenticationProtection
}