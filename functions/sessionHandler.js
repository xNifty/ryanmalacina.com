export function clearProjectSessionVariables(req) {
    if (req.session.projectionReturnTo) delete req.session.projectReturnTo;
    if (req.session.projectEditReturnTo) delete req.session.projectEditReturnTo; // Still need to delete even though we didn't use it
    if (req.session.project_id) delete req.session.project_id;
    if (req.session.projectEditSuccess) delete req.session.projectEditSuccess;
}

export function clearProjectEditSessionVariables(req) {
    if (req.session.loadProjectFromSession) delete req.session.loadProjectFromSession;
    if (req.session.project_name) delete req.session.project_name;
    if (req.session.project_title) delete req.session.project_title;
    if (req.session.project_source) delete req.session.project_source;
    if (req.session.project_description_markdown) delete req.session.project_description_markdown;
    if (req.session.project_image) delete req.session.project_image;
}