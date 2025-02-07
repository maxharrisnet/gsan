import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { getSession } from '../utils/session.server';
import Layout from '../components/layout/Layout';

export async function loader({ request, params }) {
  const session = await getSession(request.headers.get('Cookie'));
  const userData = session.get('userData');
  const { provider } = params;

  // Check if user is authenticated and is a provider
  if (!userData || userData.role !== 'provider') {
    return redirect('/dashboard');
  }

  return json({ provider: provider.toUpperCase() });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const { _action, ...values } = Object.fromEntries(formData);

  try {
    switch (_action) {
      case 'create':
        // Create new user logic
        return json({ success: true, message: 'User created successfully' });

      case 'update':
        // Update user logic
        return json({ success: true, message: 'User updated successfully' });

      case 'delete':
        // Delete user logic
        return json({ success: true, message: 'User deleted successfully' });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}

export default function ManageUsers() {
  const { provider } = useLoaderData();
  const actionData = useActionData();

  return (
    <Layout>
      <main className="content">
        <div className="container">
          <header className="section">
            <h1>Manage {provider} Users</h1>
          </header>

          {/* Create User Form */}
          <div className="section">
            <h2>Create New User</h2>
            <Form method="post" className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input 
                  type="text" 
                  id="firstName" 
                  name="firstName" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input 
                  type="text" 
                  id="lastName" 
                  name="lastName" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                />
              </div>

              <button 
                type="submit" 
                name="_action" 
                value="create"
                className="button button-primary"
              >
                Create User
              </button>
            </Form>
          </div>

          {/* Success/Error Messages */}
          {actionData?.success && (
            <div className="alert alert-success">
              {actionData.message}
            </div>
          )}
          {actionData?.error && (
            <div className="alert alert-error">
              {actionData.error}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
} 