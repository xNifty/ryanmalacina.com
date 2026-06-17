/**
  * @param {string} id - The id of the entry to be deleted
  * @param {string} csrf - The CSRF token to be sent with the request
  * @param {string} url - The URL to send the delete request to
  * @returns {string} - The HTML for the delete modal
*/
function deleteModal(id, csrf, url) {
  return `<div id="confirmModal" class="modal csp-modal is-visible" aria-hidden="false">
  <div class="modal-dialog modal-login">
    <div class="modal-content">
      <form 
        id="confirmForm" 
  hx-put="${url}${id}" 
  hx-headers='{"X-CSRF-TOKEN": "${csrf}" }'
  hx-target="#statusBox"
  hx-swap="outerHTML"
      >
        <div class="modal-header">
          <h4 class="modal-title">Confirm Delete</h4>
          <button type="button" class="close" data-csp-modal-dismiss aria-hidden="true">&times;</button>
        </div>
        <div class="modal-body">
          Are you sure you wish to delete this entry?
        </div>
        <div class="modal-footer" id="modalFooter">
          <input type="submit" class="btn btn-primary pull-right" id="modalSubmit" value="Confirm">
          <div id="confirmStatus"></div>
        </div>
      </form>
    </div>
  </div>
</div>`;
}

export default deleteModal;
