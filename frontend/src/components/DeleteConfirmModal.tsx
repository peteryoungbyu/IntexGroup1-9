interface DeleteConfirmModalProps {
  id: string;
  itemName: string;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ id, itemName, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div className="modal fade" id={id} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Delete</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <div className="modal-body">
            Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button
              type="button"
              className="btn btn-danger"
              data-bs-dismiss="modal"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
