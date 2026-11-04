import { Button, Dialog, TextField } from 'workout-coach'

export const AddClient = () => (
  <Dialog
    open onClose={() => {}} title="Add client" onSubmit={(e) => e.preventDefault()}
    actions={<><Button variant="text">Cancel</Button><Button type="submit">Add client</Button></>}
  >
    <TextField label="Name" defaultValue="Greta Baltrušaitė" />
  </Dialog>
)
