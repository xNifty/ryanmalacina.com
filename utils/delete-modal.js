function deleteModal(id, csrf) {
  return `<div id="confirmModal" class="modal fade">
  <div class="modal-dialog modal-login">
    <div class="modal-content">
      <form 
        id="confirmForm" 
  hx-put="/admin/news/delete/${id}" 
  hx-headers='{"X-CSRF-TOKEN": "${csrf}" }'
  hx-target="#statusBox"
  hx-swap="outerHTML"
      >
        <div class="modal-header">
          <h4 class="modal-title">Confirm Delete</h4>
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
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
</div><script>
      $('#confirmModal').modal('show');
    </script>`;
}

export default deleteModal;
