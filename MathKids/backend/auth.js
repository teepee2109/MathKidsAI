import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getPool, sql } from "./db.js";

const jwtSecret =
    process.env.JWT_SECRET ||
    "mathkids-development-secret-change-me";

const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


// ==========================================
// TẠO JWT TOKEN
// ==========================================

function createToken(user) {
    return jwt.sign(
        {
            userId: user.UserId,
            role: user.UserRole
        },
        jwtSecret,
        {
            expiresIn: "7d"
        }
    );
}


// ==========================================
// VALIDATE REGISTER / LOGIN
// ==========================================

export function validateCredentials(
    {
        name = "",
        email = "",
        password = "",
        confirmPassword = ""
    },
    isRegister
) {
    const errors = {};

    // Name
    if (isRegister && !name.trim()) {
        errors.name =
            "Vui lòng nhập họ và tên.";
    }

    if (
        isRegister &&
        name.trim().length < 2
    ) {
        errors.name =
            "Họ và tên phải có ít nhất 2 ký tự.";
    }

    // Email
    if (!email.trim()) {
        errors.email =
            "Vui lòng nhập email.";
    } else if (
        !emailPattern.test(
            email.trim()
        )
    ) {
        errors.email =
            "Email không đúng định dạng.";
    }

    // Password
    if (!password) {
        errors.password =
            "Vui lòng nhập mật khẩu.";
    } else if (
        password.length < 6
    ) {
        errors.password =
            "Mật khẩu cần có ít nhất 6 ký tự.";
    }

    // Confirm password
    if (
        isRegister &&
        !confirmPassword
    ) {
        errors.confirmPassword =
            "Vui lòng xác nhận mật khẩu.";
    } else if (
        isRegister &&
        password !== confirmPassword
    ) {
        errors.confirmPassword =
            "Mật khẩu xác nhận chưa khớp.";
    }

    return errors;
}


// ==========================================
// REGISTER
// ==========================================

export async function registerUser({
    name,
    email,
    password
}) {
    const pool = await getPool();

    // Hash password
    const passwordHash =
        await bcrypt.hash(
            password,
            12
        );

    // Tạo transaction
    const transaction =
        new sql.Transaction(pool);

    await transaction.begin();

    try {

        // ==============================
        // INSERT USER
        // ==============================

        const userResult =
            await transaction
                .request()

                .input(
                    "email",
                    sql.NVarChar(255),
                    email
                        .trim()
                        .toLowerCase()
                )

                .input(
                    "passwordHash",
                    sql.NVarChar(500),
                    passwordHash
                )

                .input(
                    "displayName",
                    sql.NVarChar(120),
                    name.trim()
                )

                .query(`
                    INSERT INTO [mk].[AppUser]
                    (
                        Email,
                        PasswordHash,
                        DisplayName
                    )

                    OUTPUT
                        INSERTED.UserId,
                        INSERTED.Email,
                        INSERTED.DisplayName,
                        INSERTED.UserRole

                    VALUES
                    (
                        @email,
                        @passwordHash,
                        @displayName
                    )
                `);


        const user =
            userResult.recordset[0];


        // ==============================
        // CREATE STUDENT
        // ==============================

        await transaction
            .request()

            .input(
                "studentId",
                sql.Int,
                user.UserId
            )

            .query(`
                INSERT INTO [mk].[Student]
                (
                    StudentId,
                    Grade
                )

                VALUES
                (
                    @studentId,
                    1
                )
            `);


        // ==============================
        // COMMIT
        // ==============================

        await transaction.commit();


        // ==============================
        // RETURN USER + TOKEN
        // ==============================

        return {
            token: createToken(user),

            user: {
                id: user.UserId,
                email: user.Email,
                name: user.DisplayName,
                role: user.UserRole
            }
        };

    } catch (error) {

        // Rollback nếu có lỗi
        await transaction
            .rollback()
            .catch(() => {});


        // Email bị trùng
        if (
            error.number === 2627 ||
            error.number === 2601
        ) {
            const conflict =
                new Error(
                    "Email đã được sử dụng."
                );

            conflict.status = 409;

            throw conflict;
        }

        throw error;
    }
}


// ==========================================
// LOGIN
// ==========================================

export async function loginUser({
    email,
    password
}) {
    const pool =
        await getPool();


    // Tìm user theo email
    const result =
        await pool
            .request()

            .input(
                "email",
                sql.NVarChar(255),
                email
                    .trim()
                    .toLowerCase()
            )

            .query(`
                SELECT TOP 1
                    UserId,
                    Email,
                    PasswordHash,
                    DisplayName,
                    UserRole,
                    IsActive

                FROM [mk].[AppUser]

                WHERE Email = @email
            `);


    const user =
        result.recordset[0];


    // Kiểm tra tài khoản
    if (
        !user ||
        !user.IsActive ||
        !(await bcrypt.compare(
            password,
            user.PasswordHash
        ))
    ) {
        const error =
            new Error(
                "Email hoặc mật khẩu không chính xác."
            );

        error.status = 401;

        throw error;
    }


    // Login thành công
    return {
        token: createToken(user),

        user: {
            id: user.UserId,
            email: user.Email,
            name: user.DisplayName,
            role: user.UserRole
        }
    };
}


// ==========================================
// AUTHENTICATE JWT
// ==========================================

export function authenticate(
    request,
    response,
    next
) {
    const token =
        request.headers.authorization
            ?.replace(
                /^Bearer\s+/i,
                ""
            );


    // Không có token
    if (!token) {
        return response
            .status(401)
            .json({
                message:
                    "Chưa đăng nhập."
            });
    }


    try {

        // Verify token
        request.user =
            jwt.verify(
                token,
                jwtSecret
            );

        return next();

    } catch {

        return response
            .status(401)
            .json({
                message:
                    "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
            });
    }
}

export async function requireAdmin(request, response, next) {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("userId", sql.Int, request.user.userId)
            .query("SELECT UserRole, IsActive FROM [mk].[AppUser] WHERE UserId = @userId");
        const currentUser = result.recordset[0];
        if (!currentUser || !currentUser.IsActive) {
            return response.status(401).json({ message: "Tài khoản không còn hoạt động." });
        }
        if (currentUser.UserRole !== "Admin") {
            return response.status(403).json({ message: "Bạn không có quyền truy cập chức năng quản trị." });
        }
        request.user.role = currentUser.UserRole;
        return next();
    } catch (error) {
        return response.status(500).json({ message: "Không thể xác thực quyền quản trị.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
    }
}
