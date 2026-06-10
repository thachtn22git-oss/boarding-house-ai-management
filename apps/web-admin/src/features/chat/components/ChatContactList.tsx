import type { ChatContact } from '../types'

type ChatContactListProps = {
  open: boolean
  contacts: ChatContact[]
  loading: boolean
  onClose: () => void
  onSelectContact: (contact: ChatContact) => void
}

function ChatContactList({
  open,
  contacts,
  loading,
  onClose,
  onSelectContact,
}: ChatContactListProps) {
  if (!open) {
    return null
  }

  return (
    <div className="chat-modal-backdrop" role="presentation">
      <section className="chat-contact-panel" aria-label="Start chat">
        <header>
          <div>
            <h2>Start Chat</h2>
            <p>Select a contact to open a conversation.</p>
          </div>
          <button className="chat-icon-button" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        {loading ? (
          <p className="chat-muted">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="chat-muted">No contacts available.</p>
        ) : (
          <div className="chat-contact-list">
            {contacts.map((contact) => (
              <button
                className="chat-contact-item"
                type="button"
                key={`${contact.role}-${contact.userId}`}
                onClick={() => onSelectContact(contact)}
              >
                <span className="chat-room-avatar">
                  {contact.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{contact.label}</strong>
                  <small>{contact.description ?? contact.email}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ChatContactList
