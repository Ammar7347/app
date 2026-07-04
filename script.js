// Chess Game Logic
class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kingPositions = { white: [7, 4], black: [0, 4] };
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.isFlipped = false;
        this.gameOver = false;
        
        this.initBoard();
        this.renderBoard();
        this.setupEventListeners();
    }

    initBoard() {
        // Initialize empty board
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Set up pawns
        for (let col = 0; col < 8; col++) {
            this.board[1][col] = { type: 'pawn', color: 'black' };
            this.board[6][col] = { type: 'pawn', color: 'white' };
        }
        
        // Set up other pieces
        const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        for (let col = 0; col < 8; col++) {
            this.board[0][col] = { type: pieceOrder[col], color: 'black' };
            this.board[7][col] = { type: pieceOrder[col], color: 'white' };
        }
        
        this.kingPositions = { white: [7, 4], black: [0, 4] };
    }

    getPieceSymbol(piece) {
        if (!piece) return '';
        const symbols = {
            white: {
                king: '♔',
                queen: '♕',
                rook: '♖',
                bishop: '♗',
                knight: '♘',
                pawn: '♙'
            },
            black: {
                king: '♚',
                queen: '♛',
                rook: '♜',
                bishop: '♝',
                knight: '♞',
                pawn: '♟'
            }
        };
        return symbols[piece.color][piece.type];
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';
        
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        // Update file labels
        const filesLabel = document.querySelector('.files-label');
        if (filesLabel) {
            filesLabel.innerHTML = this.isFlipped 
                ? files.slice().reverse().map(f => `<span>${f}</span>`).join('')
                : files.map(f => `<span>${f}</span>`).join('');
        }
        
        // Update rank labels
        const ranksLabel = document.querySelector('.ranks-label');
        if (ranksLabel) {
            ranksLabel.innerHTML = this.isFlipped
                ? ranks.slice().reverse().map(r => `<span>${r}</span>`).join('')
                : ranks.map(r => `<span>${r}</span>`).join('');
        }
        
        // Render squares
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const displayRow = this.isFlipped ? 7 - row : row;
                const displayCol = this.isFlipped ? 7 - col : col;
                
                const square = document.createElement('div');
                square.className = `square ${(displayRow + displayCol) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = displayRow;
                square.dataset.col = displayCol;
                
                // Highlight selected square
                if (this.selectedSquare && 
                    this.selectedSquare[0] === displayRow && 
                    this.selectedSquare[1] === displayCol) {
                    square.classList.add('selected');
                }
                
                // Highlight valid moves
                const isValidMove = this.validMoves.some(m => m[0] === displayRow && m[1] === displayCol);
                if (isValidMove) {
                    if (this.board[displayRow][displayCol]) {
                        square.classList.add('valid-capture');
                    } else {
                        square.classList.add('valid-move');
                    }
                }
                
                // Highlight last move
                if (this.moveHistory.length > 0) {
                    const lastMove = this.moveHistory[this.moveHistory.length - 1];
                    if ((lastMove.from[0] === displayRow && lastMove.from[1] === displayCol) ||
                        (lastMove.to[0] === displayRow && lastMove.to[1] === displayCol)) {
                        square.classList.add('last-move');
                    }
                }
                
                // Highlight king in check
                const piece = this.board[displayRow][displayCol];
                if (piece && piece.type === 'king' && piece.color === this.currentPlayer) {
                    if (this.isKingInCheck(this.currentPlayer)) {
                        square.classList.add('check');
                    }
                }
                
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = `piece ${piece.color}`;
                    pieceElement.textContent = this.getPieceSymbol(piece);
                    square.appendChild(pieceElement);
                }
                
                boardElement.appendChild(square);
            }
        }
        
        this.updateCapturedPieces();
        this.updateStatus();
    }

    getValidMoves(row, col, checkSafety = true) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        let moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, piece.color);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, piece.color);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, piece.color);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, piece.color);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, piece.color);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, piece.color);
                break;
        }
        
        // Filter moves that would leave king in check
        if (checkSafety) {
            moves = moves.filter(move => {
                return !this.wouldBeInCheck(row, col, move[0], move[1], piece.color);
            });
        }
        
        return moves;
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        
        // Forward move
        if (this.isValidSquare(row + direction, col) && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            
            // Double move from starting position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }
        
        // Captures
        for (const captureCol of [col - 1, col + 1]) {
            if (this.isValidSquare(row + direction, captureCol)) {
                const targetPiece = this.board[row + direction][captureCol];
                if (targetPiece && targetPiece.color !== color) {
                    moves.push([row + direction, captureCol]);
                }
                
                // En passant
                if (this.enPassantTarget && 
                    this.enPassantTarget[0] === row + direction && 
                    this.enPassantTarget[1] === captureCol) {
                    moves.push([row + direction, captureCol]);
                }
            }
        }
        
        return moves;
    }

    getRookMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
    }

    getBishopMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    }

    getQueenMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [
            [0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]);
    }

    getSlidingMoves(row, col, color, directions) {
        const moves = [];
        
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            while (this.isValidSquare(r, c)) {
                if (!this.board[r][c]) {
                    moves.push([r, c]);
                } else {
                    if (this.board[r][c].color !== color) {
                        moves.push([r, c]);
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        
        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            if (this.isValidSquare(r, c)) {
                if (!this.board[r][c] || this.board[r][c].color !== color) {
                    moves.push([r, c]);
                }
            }
        }
        
        return moves;
    }

    getKingMoves(row, col, color) {
        const moves = [];
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = row + dr;
                const c = col + dc;
                
                if (this.isValidSquare(r, c)) {
                    if (!this.board[r][c] || this.board[r][c].color !== color) {
                        moves.push([r, c]);
                    }
                }
            }
        }
        
        // Castling
        if (!this.isKingInCheck(color)) {
            const rights = this.castlingRights[color];
            const kingRow = color === 'white' ? 7 : 0;
            
            // Kingside
            if (rights.kingSide && 
                !this.board[kingRow][5] && 
                !this.board[kingRow][6] &&
                !this.isSquareAttacked(kingRow, 5, color) &&
                !this.isSquareAttacked(kingRow, 6, color)) {
                moves.push([kingRow, 6]);
            }
            
            // Queenside
            if (rights.queenSide && 
                !this.board[kingRow][1] && 
                !this.board[kingRow][2] && 
                !this.board[kingRow][3] &&
                !this.isSquareAttacked(kingRow, 2, color) &&
                !this.isSquareAttacked(kingRow, 3, color)) {
                moves.push([kingRow, 2]);
            }
        }
        
        return moves;
    }

    isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isSquareAttacked(row, col, color) {
        const opponentColor = color === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === opponentColor) {
                    const attacks = this.getValidMoves(r, c, false);
                    if (attacks.some(m => m[0] === row && m[1] === col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        // Make temporary move
        const capturedPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;
        
        // Update king position if king moved
        let originalKingPos = null;
        if (movingPiece.type === 'king') {
            originalKingPos = [...this.kingPositions[color]];
            this.kingPositions[color] = [toRow, toCol];
        }
        
        const inCheck = this.isKingInCheck(color);
        
        // Undo temporary move
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = capturedPiece;
        
        if (originalKingPos) {
            this.kingPositions[color] = originalKingPos;
        }
        
        return inCheck;
    }

    isKingInCheck(color) {
        const [kingRow, kingCol] = this.kingPositions[color];
        return this.isSquareAttacked(kingRow, kingCol, color);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Handle en passant capture
        if (piece.type === 'pawn' && this.enPassantTarget &&
            toRow === this.enPassantTarget[0] && toCol === this.enPassantTarget[1]) {
            const capturedPawnRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            const capturedPawn = this.board[capturedPawnRow][toCol];
            this.capturedPieces[piece.color].push(capturedPawn);
            this.board[capturedPawnRow][toCol] = null;
        }
        
        // Handle castling
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            if (toCol === 6) { // Kingside
                this.board[toRow][5] = this.board[toRow][7];
                this.board[toRow][7] = null;
            } else if (toCol === 2) { // Queenside
                this.board[toRow][3] = this.board[toRow][0];
                this.board[toRow][0] = null;
            }
        }
        
        // Update castling rights
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
        }
        if (piece.type === 'rook') {
            if (fromCol === 0) {
                this.castlingRights[piece.color].queenSide = false;
            } else if (fromCol === 7) {
                this.castlingRights[piece.color].kingSide = false;
            }
        }
        
        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Capture
        if (capturedPiece) {
            this.capturedPieces[piece.color].push(capturedPiece);
        }
        
        // Update king position
        if (piece.type === 'king') {
            this.kingPositions[piece.color] = [toRow, toCol];
        }
        
        // Set en passant target
        this.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = [(fromRow + toRow) / 2, fromCol];
        }
        
        // Handle pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.showPromotionDialog(toRow, toCol, piece.color);
            return;
        }
        
        this.finishMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
    }

    finishMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece, promotionType = null) {
        // Record move
        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece, promotionType);
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            captured: capturedPiece,
            notation: moveNotation,
            promotion: promotionType
        });
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        
        this.renderBoard();
        this.renderMoveHistory();
        
        // Check for game end conditions
        this.checkGameEnd();
    }

    showPromotionDialog(row, col, color) {
        const modal = document.getElementById('game-modal');
        const title = document.getElementById('modal-title');
        const message = document.getElementById('modal-message');
        const newGameBtn = document.getElementById('modal-new-game');
        
        title.textContent = 'Pawn Promotion';
        message.innerHTML = `
            <div style="display: flex; gap: 1rem; justify-content: center; margin: 2rem 0;">
                ${['queen', 'rook', 'bishop', 'knight'].map(type => `
                    <button class="btn btn-secondary promote-btn" data-type="${type}" style="font-size: 2rem; padding: 1rem;">
                        ${this.getPieceSymbol({ type, color })}
                    </button>
                `).join('')}
            </div>
        `;
        
        modal.classList.add('show');
        newGameBtn.style.display = 'none';
        
        document.querySelectorAll('.promote-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const promotionType = btn.dataset.type;
                this.board[row][col].type = promotionType;
                modal.classList.remove('show');
                newGameBtn.style.display = 'block';
                
                const lastMove = this.moveHistory[this.moveHistory.length - 1];
                this.finishMove(lastMove.from[0], lastMove.from[1], row, col, 
                    lastMove.piece, lastMove.captured, promotionType);
            });
        });
    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece, promotionType) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            return toCol === 6 ? 'O-O' : 'O-O-O';
        }
        
        let notation = '';
        
        if (piece.type !== 'pawn') {
            notation += piece.type.charAt(0).toUpperCase();
            if (piece.type === 'knight') notation = 'N';
        }
        
        if (capturedPiece || (piece.type === 'pawn' && fromCol !== toCol)) {
            if (piece.type === 'pawn') {
                notation += files[fromCol];
            }
            notation += 'x';
        }
        
        notation += files[toCol] + ranks[toRow];
        
        if (promotionType) {
            if (promotionType === 'knight') {
                notation += '=N';
            } else {
                notation += '=' + promotionType.charAt(0).toUpperCase();
            }
        }
        
        return notation;
    }

    checkGameEnd() {
        const hasLegalMoves = this.hasLegalMoves(this.currentPlayer);
        const inCheck = this.isKingInCheck(this.currentPlayer);
        
        if (!hasLegalMoves) {
            this.gameOver = true;
            const modal = document.getElementById('game-modal');
            const title = document.getElementById('modal-title');
            const message = document.getElementById('modal-message');
            const newGameBtn = document.getElementById('modal-new-game');
            
            if (inCheck) {
                const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
                title.textContent = 'Checkmate!';
                message.textContent = `${winner} wins!`;
            } else {
                title.textContent = 'Stalemate';
                message.textContent = "The game is a draw.";
            }
            
            modal.classList.add('show');
            newGameBtn.style.display = 'block';
        } else if (inCheck) {
            // Just update status, no modal
        }
    }

    hasLegalMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col, true);
                    if (moves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    updateCapturedPieces() {
        const capturedByWhite = document.getElementById('captured-by-white');
        const capturedByBlack = document.getElementById('captured-by-black');
        
        capturedByWhite.innerHTML = this.capturedPieces.white
            .map(p => `<span class="captured-piece">${this.getPieceSymbol(p)}</span>`)
            .join('');
        
        capturedByBlack.innerHTML = this.capturedPieces.black
            .map(p => `<span class="captured-piece">${this.getPieceSymbol(p)}</span>`)
            .join('');
    }

    updateStatus() {
        const statusText = document.getElementById('status-text');
        const whitePlayer = document.querySelector('.white-player');
        const blackPlayer = document.querySelector('.black-player');
        
        if (this.gameOver) {
            return;
        }
        
        whitePlayer.classList.toggle('active', this.currentPlayer === 'white');
        blackPlayer.classList.toggle('active', this.currentPlayer === 'black');
        
        let status = this.currentPlayer === 'white' ? "White's Turn" : "Black's Turn";
        
        if (this.isKingInCheck(this.currentPlayer)) {
            status += ' - Check!';
        }
        
        statusText.textContent = status;
    }

    renderMoveHistory() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';
        
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];
            
            const row = document.createElement('div');
            row.className = 'move-row';
            row.innerHTML = `
                <span class="move-number">${moveNumber}.</span>
                <span class="move-white">${whiteMove.notation}</span>
                <span class="move-black">${blackMove ? blackMove.notation : ''}</span>
            `;
            
            moveList.appendChild(row);
        }
        
        moveList.scrollTop = moveList.scrollHeight;
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;
        
        const piece = this.board[row][col];
        
        // If a square is already selected
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            // Check if clicking on a valid move
            const isValidMove = this.validMoves.some(m => m[0] === row && m[1] === col);
            
            if (isValidMove) {
                this.makeMove(selectedRow, selectedCol, row, col);
                return;
            }
            
            // If clicking on own piece, select it instead
            if (piece && piece.color === this.currentPlayer) {
                this.selectedSquare = [row, col];
                this.validMoves = this.getValidMoves(row, col);
                this.renderBoard();
                return;
            }
            
            // Deselect
            this.selectedSquare = null;
            this.validMoves = [];
            this.renderBoard();
            return;
        }
        
        // Select a piece
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = [row, col];
            this.validMoves = this.getValidMoves(row, col);
            this.renderBoard();
        }
    }

    undoMove() {
        if (this.moveHistory.length === 0 || this.gameOver) return;
        
        // For now, just reset the game as full undo is complex
        // A full implementation would need to store board states
        this.initNewGame();
    }

    flipBoard() {
        this.isFlipped = !this.isFlipped;
        this.renderBoard();
    }

    initNewGame() {
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kingPositions = { white: [7, 4], black: [0, 4] };
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.gameOver = false;
        this.isFlipped = false;
        
        this.initBoard();
        this.renderBoard();
        this.renderMoveHistory();
        
        const modal = document.getElementById('game-modal');
        const newGameBtn = document.getElementById('modal-new-game');
        modal.classList.remove('show');
        newGameBtn.style.display = 'block';
    }

    setupEventListeners() {
        const board = document.getElementById('chess-board');
        board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });
        
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.initNewGame();
        });
        
        document.getElementById('modal-new-game').addEventListener('click', () => {
            this.initNewGame();
        });
        
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undoMove();
        });
        
        document.getElementById('flip-btn').addEventListener('click', () => {
            this.flipBoard();
        });
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
