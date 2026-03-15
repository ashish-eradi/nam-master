
import { Link } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';

const drawerWidth = 240;

const Sidebar = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
      data-testid="sidebar"
    >
      <Toolbar />
      <List>
        <ListItemButton component={Link} to="/dashboard">
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton component={Link} to="/schools">
          <ListItemText primary="Schools" />
        </ListItemButton>
        <ListItemButton component={Link} to="/licenses">
          <ListItemText primary="Licenses" />
        </ListItemButton>
        <ListItemButton component={Link} to="/users">
          <ListItemText primary="Users" />
        </ListItemButton>
        <ListItemButton component={Link} to="/reports">
          <ListItemText primary="Reports" />
        </ListItemButton>

      </List>
    </Drawer>
  );
};

export default Sidebar;
