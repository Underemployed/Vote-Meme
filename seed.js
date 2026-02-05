
// Create default admin account on startup and call it inn app.run
async function createAdminAccount() {
    try {
        const adminExists = await User.findOne({ email: 'admin@admin.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Admin',
                email: 'admin@admin.com',
                password: hashedPassword,
                isAdmin: true
            });
            console.log('Admin account created: admin@admin.com / admin123');
        }
    } catch (error) {
        console.error('Error creating admin account:', error);
    }
}

