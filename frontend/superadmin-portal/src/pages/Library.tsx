
import React, { useState, useEffect } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Book } from '../services/libraryApi';
import { useGetBooksQuery, useCreateBookMutation, useUpdateBookMutation, useDeleteBookMutation } from '../services/libraryApi';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DataGrid, GridRowParams } from '@mui/x-data-grid';

const Library = () => {
  const columns: GridColDef<Book>[] = [
    { field: 'title', headerName: 'Title', width: 250 },
    { field: 'author', headerName: 'Author', width: 200 },
    { field: 'isbn', headerName: 'ISBN', width: 150 },
    { field: 'school_id', headerName: 'School ID', width: 250 },
    { field: 'total_copies', headerName: 'Total Copies', width: 120 },
    { field: 'available_copies', headerName: 'Available Copies', width: 150 },
  ];

  const { data: books, isLoading } = useGetBooksQuery();
  const [createBook] = useCreateBookMutation();
  const [updateBook] = useUpdateBookMutation();
  const [deleteBook] = useDeleteBookMutation();

  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formState, setFormState] = useState<Partial<Book>>({});

  useEffect(() => {
    if (selectedBook) {
      setFormState(selectedBook);
    } else {
      setFormState({});
    }
  }, [selectedBook]);

  const handleClickOpen = (book: Book | null = null) => {
    setSelectedBook(book);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedBook(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [event.target.name]: event.target.value });
  };

  const handleSave = async () => {
    if (selectedBook) {
      await updateBook({ id: selectedBook.id, body: formState });
    } else {
      await createBook(formState);
    }
    handleClose();
  };

  const handleDelete = async () => {
    if (selectedBook) {
      await deleteBook(selectedBook.id);
      handleClose();
    }
  };

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Global Library Management
      </Typography>
      <Button variant="contained" onClick={() => handleClickOpen()} sx={{ mb: 2 }}>
        Create Book
      </Button>
      <DataGrid
        rows={books || []}
        columns={columns}
        loading={isLoading}
        onRowClick={(params: GridRowParams<Book>) => handleClickOpen(params.row)}
      />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedBook ? 'Edit Book' : 'Create Book'}</DialogTitle>
        <DialogContent>
          <TextField margin="normal" required fullWidth id="title" label="Title" name="title" value={formState.title || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="author" label="Author" name="author" value={formState.author || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="isbn" label="ISBN" name="isbn" value={formState.isbn || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="school_id" label="School ID" name="school_id" value={formState.school_id || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth type="number" id="total_copies" label="Total Copies" name="total_copies" value={formState.total_copies || ''} onChange={handleInputChange} />
        </DialogContent>
        <DialogActions>
          {selectedBook && <Button onClick={handleDelete} color="error">Delete</Button>}
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Library;
